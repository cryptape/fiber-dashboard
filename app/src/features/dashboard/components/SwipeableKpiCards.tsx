"use client";

import { useState, useRef, useEffect } from "react";
import KpiCard from "./KpiCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { KpiData } from "@/lib/types";

export function SwipeableKpiCards({ kpiData }: { kpiData?: KpiData }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const kpiCards = [
    {
      title: "Total Capacity",
      value: `${kpiData?.totalCapacity || "0.0"} CKB`,
      precision: 1,
      change: kpiData?.maxChannelCapacity,
      className: "animate-slide-up",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
    },
    {
      title: "Total Nodes",
      value: kpiData?.totalNodes || "0",
      precision: 0,
      change: kpiData?.maxChannelCapacity,
      className: "animate-slide-up [animation-delay:0.1s]",
      iconBg: "bg-green-500/10",
      iconColor: "text-green-600",
    },
    {
      title: "Total Channels",
      value: kpiData?.totalChannels || "0",
      precision: 0,
      change: kpiData?.maxChannelCapacity,
      className: "animate-slide-up [animation-delay:0.2s]",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-600",
    },
    {
      title: "Avg Channel Capacity",
      value: `${kpiData?.averageChannelCapacity || "0.00"} CKB`,
      change: kpiData?.maxChannelCapacity,
      className: "animate-slide-up [animation-delay:0.3s]",
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-600",
    },
    {
      title: "Max Channel Capacity",
      value: `${kpiData?.maxChannelCapacity || "0.0"} CKB`,
      change: kpiData?.maxChannelCapacity,
      className: "animate-slide-up [animation-delay:0.4s]",
      iconBg: "bg-red-500/10",
      iconColor: "text-red-600",
    },
    {
      title: "Min Channel Capacity",
      value: `${kpiData?.minChannelCapacity || "0.0"} CKB`,
      change: kpiData?.minChannelCapacity,
      className: "animate-slide-up [animation-delay:0.5s]",
      iconBg: "bg-yellow-500/10",
      iconColor: "text-yellow-600",
    },
    {
      title: "Median Capacity",
      value: `${kpiData?.medianChannelCapacity || "0.0"} CKB`,
      change: kpiData?.medianChannelCapacity,
      className: "animate-slide-up [animation-delay:0.6s]",
      iconBg: "bg-pink-500/10",
      iconColor: "text-pink-600",
    },
  ];

  const cardWidth = 256; // w-64 = 16rem = 256px
  const gap = 24; // gap-6 = 1.5rem = 24px
  const cardsPerView = Math.floor(
    (scrollContainerRef.current?.clientWidth || 1200) / (cardWidth + gap)
  );

  const scrollToIndex = (index: number) => {
    if (scrollContainerRef.current) {
      const scrollLeft = index * (cardWidth + gap);
      scrollContainerRef.current.scrollTo({
        left: scrollLeft,
        behavior: "smooth",
      });
      setCurrentIndex(index);
    }
  };

  const scrollLeft = () => {
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
    }
  };

  const scrollRight = () => {
    if (currentIndex < kpiCards.length - cardsPerView) {
      scrollToIndex(currentIndex + 1);
    }
  };

  useEffect(() => {
    const updateArrows = () => {
      setShowLeftArrow(currentIndex > 0);
      setShowRightArrow(currentIndex < kpiCards.length - cardsPerView);
    };
    updateArrows();
  }, [currentIndex, cardsPerView, kpiCards.length]);

  useEffect(() => {
    const handleResize = () => {
      const newCardsPerView = Math.floor(
        (scrollContainerRef.current?.clientWidth || 1200) / (cardWidth + gap)
      );
      if (currentIndex > kpiCards.length - newCardsPerView) {
        setCurrentIndex(Math.max(0, kpiCards.length - newCardsPerView));
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentIndex, kpiCards.length]);

  return (
    <div className="relative">
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-background/80 backdrop-blur-sm border border-border rounded-full flex items-center justify-center hover:bg-background/90 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
      )}

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-background/80 backdrop-blur-sm border border-border rounded-full flex items-center justify-center hover:bg-background/90 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <ChevronRight className="h-5 w-5 text-foreground" />
        </button>
      )}

      {/* Scroll Container */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="flex gap-6 min-w-max py-2">
          {kpiCards.map((card, index) => (
            <KpiCard
              key={index}
              title={card.title}
              value={card.value}
              precision={card.precision}
              change={card.change}
              className={`${card.className} w-50 h-32 flex-shrink-0`}
              iconBg={card.iconBg}
              iconColor={card.iconColor}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
