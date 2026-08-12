"use client";

import Link from "next/link";
import Image from "next/image";
import startPageImages from "@/data/startPageImages.json";
import { useState, useEffect } from "react";
import LoadingPage from "@/components/LoadingPage";

const { innerCircleImages, outerCircleImages } = startPageImages;

function CircleImages({
  images,
  imageClass,
  containerClass,
  rotateKey = "deg",
}: {
  images: { src: string; deg: number }[];
  imageClass: string;
  containerClass: string;
  rotateKey?: string;
}) {
  return (
    <>
      {images.map((img, i) => (
        <div
          key={img.src + img.deg}
          className={`absolute w-full h-full rotate-[${
            img[rotateKey as keyof typeof img]
          }deg]`}
          style={{
            transform: `rotate(${img[rotateKey as keyof typeof img]}deg)`,
          }}
        >
          <div
            className={imageClass}
            style={{
              opacity: 1,
            }}
          >
            <div className="flex items-center justify-center w-full h-full">
              <Image
                src={img.src}
                alt=""
                width={200}
                height={200}
                className="object-contain w-full h-full max-w-full max-h-full"
                draggable={false}
                priority={false}
              />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

export default function Home() {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Trigger initial animation after component mounts
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleStartClick = () => {
    setIsLoading(true);
  };

  const handleLoadingComplete = () => {
    // Navigate to configurator after loading completes
    window.location.href = "/configurator";
  };

  if (isLoading) {
    return <LoadingPage onLoadingComplete={handleLoadingComplete} />;
  }

  return (
    <div className="bg-white">
      <div>
        <div
          id="main"
          className="relative flex flex-col w-full bg-transparent bg-gray-300 min-h-[100vh] overflow-hidden"
        >
          <div className="absolute top-0 flex w-full h-full">
            <div
              id="product-visualization"
              className="relative flex-1 bg-gray-300 select-none cursor-grab active:cursor-grabbing h-full"
            >
              <div id="scene-manager" className="absolute w-full h-full">
                <div className="w-full h-full bg-gray-300">
                  <div className="absolute z-50 flex w-full h-full bg-[#1F1F1F]">
                    <div className="relative z-30 flex flex-col items-center justify-center w-full h-full -mt-5">
                      <h1
                        id="title-wallet"
                        className="text-white text-center font-bold tracking-tight -translate-x-0.5 text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] px-4"
                      >
                        Customize your IZY
                      </h1>
                      <p className="text-white/50 text-sm sm:text-base mt-3 text-center px-4">
                        Design your own bottle — pick colors, add a texture or city map.
                      </p>
                      <button
                        onClick={handleStartClick}
                        className="cursor-pointer select-none touch-none mt-8 sm:mt-10 px-10 py-4 rounded-full bg-white text-black text-sm font-bold tracking-wide uppercase transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95"
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                      >
                        Start designing
                      </button>
                    </div>
                    {/* <div
                      className="absolute z-20 w-full h-full"
                      style={{
                        background:
                          "linear-gradient(130deg, rgba(0, 0, 0, 0.63) -12.58%, rgba(0, 0, 0, 0.1) 50.15%, rgba(0, 0, 0, 0.35) 80.07%)",
                      }}
                    ></div> */}
                    <div className="absolute w-full h-full bg-white">
                      <div
                        className="absolute flex items-center justify-center w-full h-full wrapper animate-spin"
                        style={{
                          transform: "rotate(49.4629deg)",
                          animationDuration: "120s",
                          animationDirection: "normal",
                        }}
                      >
                        <div
                          id="inner-circle"
                          className="absolute max-w-[620px] max-h-[620px] w-[40vw] h-[40vw] sm:w-[50vw] sm:h-[50vw] min-w-[250px] min-h-[250px] sm:min-w-[300px] sm:min-h-[300px] transition-all duration-[2000ms] ease-out"
                          style={{
                            transform: `scale(${
                              isHovered ? 0.8 : isLoaded ? 1 : 1.5
                            })`,
                          }}
                        >
                          <CircleImages
                            images={innerCircleImages}
                            imageClass="relative flex items-center justify-center overflow-hidden circle-image absolute flex-shrink-0 -rotate-45 -translate-x-1/2 -translate-y-1/2 max-w-[180px] max-h-[180px] sm:max-w-[220px] sm:max-h-[220px] w-[16vw] h-[16vw] sm:w-[20vw] sm:h-[20vw] min-w-[100px] min-h-[100px] sm:min-w-[120px] sm:min-h-[120px]"
                            containerClass="absolute w-full h-full"
                          />
                        </div>
                      </div>
                      <div
                        className="absolute flex items-center justify-center w-full h-full wrapper-2 animate-spin"
                        style={{
                          transform: "rotate(-278.456deg)",
                          animationDuration: "200s",
                          animationDirection: "reverse",
                        }}
                      >
                        <div
                          id="outer-circle"
                          className="absolute max-w-[1100px] max-h-[1100px] w-[80vw] h-[80vw] sm:w-[90vw] sm:h-[90vw] min-w-[400px] min-h-[400px] sm:min-w-[520px] sm:min-h-[520px] transition-all duration-[2000ms] ease-out"
                          style={{
                            transform: `scale(${
                              isHovered ? 0.8 : isLoaded ? 1 : 1.5
                            })`,
                          }}
                        >
                          <CircleImages
                            images={outerCircleImages}
                            imageClass="relative flex items-center justify-center overflow-hidden absolute circle-image flex-shrink-0 bg-transparent -rotate-45 -translate-x-1/2 -translate-y-1/2 max-w-[200px] max-h-[200px] sm:max-w-[260px] sm:max-h-[260px] w-[16vw] h-[16vw] sm:w-[20vw] sm:h-[20vw] min-w-[120px] min-h-[120px] sm:min-w-[140px] sm:min-h-[140px]"
                            containerClass="absolute w-full h-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
