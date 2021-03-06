import React, { useEffect } from "react";
import { isMobile } from "lib/utils/device";
import { useObserver } from "mobx-react-lite";
import PcVideoCard from "./templates/PcVideoCard";
import NewVideoButton from "./templates/NewVideoButton";
import VideoCardList from "./templates/VideoCardList";
import useRouter from "lib/hooks/useRouter";
import { useStore } from "stores";

function MyVideosContainer() {
  const { history } = useRouter();
  const { myVideosStore: store } = useStore();
  const handleClickNewVideo = async (value: string) => {
    if (!value) return false;

    const success = await store.addMyVideo(value);
    if (success) await store.getMyVideos();
    return success;
  };

  useEffect(() => {
    if (store.getList().length === 0 || history.action === "PUSH") store.getMyVideos();
  }, [store, history.action]);

  const VideoCard = isMobile() ? PcVideoCard : PcVideoCard;
  return useObserver(() => (
    <>
      <NewVideoButton adding={store.adding} onClick={handleClickNewVideo} />
      <VideoCardList loading={store.loading}>
        {store.list.map(video => (
          <VideoCard {...video} key={video.videoId} />
        ))}
      </VideoCardList>
    </>
  ));
}

export default MyVideosContainer;
