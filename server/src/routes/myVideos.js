import compact from "lodash/compact";
import isEmpty from "lodash/isEmpty";
import db from "../models";
import logger from "../lib/utils/logger";
import config from "../lib/variables/config";
import errorCodes from "../lib/variables/errorCodes";
import { makeSuccessFormat } from "../lib/utils/makeRespFormat";
import { getTedHtmlData, getTedLanguages, getTedVideoUrl, getTedMetaData, getTedTags, getTedTiming } from "../lib/utils/ted";

/**
 * [GET] 내 비디오 리스트 가져오기
 * 1) Request
 * - page: number(default = 1)
 *
 * 2) Response
 * - totalCount: number
 * - totalPage: number
 * - currentPage: number
 * - list: [object]
 *    - videoId
 *    - title
 *    - author
 *    - thumbnail
 *    - duration
 */
export const getMyVideos = async (req, res, next) => {
  try {
    logger.info("getMyVideos - Request");
    const { page = 1 } = req.body;
    const { uid, language } = req.user || {};

    const totalCount = await db.myVideos.count({ where: { uid } });
    const myVideoIds = await db.myVideos.findAll({
      where: { uid },
      order: [["createdAt", "DESC"]],
    });

    if (myVideoIds !== null) {
      logger.info("getMyVideos - Success");

      const list = await Promise.all(
        myVideoIds.map(async ({ videoId, isFavorite }) => {
          const { thumbnail, duration } = await db.videos.findOne({ where: { videoId } });
          const { title, author } = await db[`lang${language.toUpperCase()}`].findOne({ where: { videoId } });

          return { videoId, thumbnail, title, author, isFavorite, duration };
        }),
      );

      res.send(
        makeSuccessFormat({
          list,
          totalCount,
          currentPage: page,
        }),
      );
    }
  } catch (err) {
    next(err);
  }
};

/**
 * [PUT] Favorite 상태 수정
 *
 * 1) Request
 * - isFavorite: (boolean)
 *
 * 2) Response
 * - success
 */
export const editFavoriteStatus = async (req, res, next) => {
  try {
    logger.info("editFavoriteStatus - Request");
    const { videoId, isFavorite } = req.body;
    if (!videoId || typeof isFavorite !== "boolean") {
      return next(errorCodes["400"]);
    }

    const { uid } = req.user;
    const isUpdated = db.myVideos.update({ isFavorite }, { where: { uid, videoId } });
    if (isUpdated) {
      logger.info("editFavoriteStatus - Success");
      res.send(makeSuccessFormat());
    }
  } catch (err) {
    next(err);
  }
};

/**
 * [DELETE] 내 비디오 리스트에서 Video 삭제
 *
 * [Request]
 * - videoId
 *
 * [Response]
 * - success만 보내기
 */
export const deleteMyVideo = (req, res, next) => {
  try {
    logger.info("deleteMyVideo - Request");
    const { videoId } = req.body;
    if (!videoId) {
      return next(errorCodes["400"]);
    }

    const { uid } = req.user;
    const isDeleted = db.myVideos.destroy({ where: { uid, videoId } });
    if (isDeleted) {
      logger.info("deleteMyVideo - Success");
      res.send(makeSuccessFormat());
    }
  } catch (err) {
    next(err);
  }
};

/**
 * [POST] 내 비디오 리스트 Video 추가
 * 받아올 데이터: url -> 일단 크롤링. -> talkId -> talkId DB에 있는지 검사. -> 없으면 더 크롤링 -> DB에 저장.
 *
 * 1) Request
 * - tedUrl: (string) TED video url
 *
 * 2) Response
 * - videoId
 * - title
 * - author
 * - thumbnail
 * - duration
 */
export const addMyVideo = async (req, res, next) => {
  try {
    logger.info("addMyVideo - Request");
    const { tedUrl } = req.body;
    if (!tedUrl && !config.TED_URL.test(tedUrl)) {
      return next(errorCodes["400"]);
    }

    const params = await getTedHtmlData(tedUrl);
    if (!params) return next(errorCodes["2000"]);

    // talkId 유무 검사
    const { talkId } = params;
    let { videoId } = (await db.talkIds.findOne({ where: { talkId } })) || {};
    logger.info(`addMyVideo - check videoId = ${videoId}`);

    if (!videoId) {
      const videoUrl = getTedVideoUrl(params);
      if (isEmpty(videoUrl)) return next(errorCodes["2001"]);

      const metaData = getTedMetaData(params);
      const timing = await getTedTiming(params);
      const langMap = compact(await getTedLanguages(params));
      if (isEmpty(langMap)) return next(errorCodes["2002"]);

      // videoId 설정
      const createdVideo = await db.videos.create({
        talkId,
        timing,
        ...videoUrl,
        ...metaData,
      });
      videoId = createdVideo.videoId;
      logger.info(`addMyVideo - add video = ${videoId}`);

      const tags = getTedTags(params);
      for (const tag of tags) await db.tags.create({ tag, videoId });
      await db.talkIds.create({ talkId, videoId });
      logger.info("addMyVideo - add tags, talkIds");

      // 언어별 데이터 저장
      const langCodes = langMap.map(l => l.languageCode);
      await Promise.all(
        langCodes.map(langCode => {
          const tableName = `lang${langCode.replace("-", "").toUpperCase()}`;
          const { title, description, author, script } = langMap.find(l => l.languageCode === langCode);
          return db[tableName].create({ videoId, title, description, author, script });
          logger.info(`addMyVideo - add lang = ${langCode}`);
        }),
      );
    }

    // 지원하는 언어인지 검사 후 전달
    const { uid, language } = req.user;
    const hasLang = await db[`lang${language.replace("-", "").toUpperCase()}`].findOne({ where: videoId });
    if (hasLang === null) return next(errorCodes["2002"]);

    // MyVideos에 Insert
    await db.myVideos.create({ uid, videoId });
    logger.info("addMyVideo - create my video");

    res.send(makeSuccessFormat());
    logger.info("addMyVideo - Success");
  } catch (err) {
    next(err);
  }
};
