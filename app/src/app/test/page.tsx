"use client";

import NetworkGraphTestPage from "./NetworkGraphTest";
import ChannelsOnMapTestPage from "./ChannelsOnMapTest";
import NodesOnMapTestPage from "./NodesOnMapTest";

export default function TestPage() {
  return (
    <div>
      <NetworkGraphTestPage />
      <ChannelsOnMapTestPage />
      <NodesOnMapTestPage />
    </div>
  );
}
