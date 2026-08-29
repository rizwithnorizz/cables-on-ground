"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

type InventoryFeature = {
  title: string;
  description: string;
};

export function LandingScrollSections({
  inventoryFeatures,
}: {
  inventoryFeatures: InventoryFeature[];
}) {
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          const shouldShow = entry.isIntersecting;
          const shouldExit = !entry.isIntersecting && entry.boundingClientRect.top < window.innerHeight * 0.75;

          el.classList.toggle("is-visible", shouldShow);
          el.classList.toggle("is-exiting", shouldExit);

          const heroMedia = el.querySelector(".landing-hero-media");
          const heroCopy = el.querySelector(".landing-hero-copy");
          const statementText = el.querySelector(".landing-statement .text-balance");
          const drumsImage = el.querySelector(".landing-drums-image");
          const featureCopy = el.querySelector(".landing-feature-copy");

          [heroMedia, heroCopy, statementText, drumsImage, featureCopy].forEach((node) => {
            if (!node) return;
            node.classList.toggle("is-visible", shouldShow);
            node.classList.toggle("is-exiting", shouldExit);
          });
        });
      },
      {
        threshold: [0.2, 0.6],
        rootMargin: "0px 0px -6% 0px",
      }
    );

    sectionRefs.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <section
        ref={(node) => {
          sectionRefs.current[0] = node;
        }}
        className="landing-hero relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden px-5 pt-[72px] text-center sm:px-8"
      >
        <Image
          src="/images/cable-hero.png"
          alt="Close-up of an electrical cable cross-section"
          fill
          priority
          sizes="100vw"
          className="landing-hero-media object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,12,0.74)_0%,rgba(6,11,16,0.68)_54%,#000000_100%)]" />
        <div className="landing-hero-copy relative flex max-w-4xl flex-col items-center">
          <h1 className="max-w-[20rem] text-balance text-4xl font-semibold leading-[0.96] tracking-[-0.04em] text-white sm:max-w-none sm:text-7xl lg:text-[6.25rem]">
            Cables on Ground
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-[#D7DFE8] sm:text-lg sm:leading-8">
            A clear operating view of the cable drums ready for your next move
          </p>
          <Link
            href="/cables_view"
            className="group mt-10 inline-flex min-h-12 items-center gap-3 rounded-xl border border-white/70 bg-white/[0.06] px-5 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-[#101821] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#101821]"
          >
            Open cable inventory
          </Link>
        </div>
      </section>

      <section
        ref={(node) => {
          sectionRefs.current[1] = node;
        }}
        className="landing-statement relative flex min-h-[72svh] items-center justify-center overflow-hidden bg-black px-5 py-24 text-center sm:px-8 sm:py-32"
      >
        <div className="relative max-w-4xl">
          <p className="text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-white sm:text-6xl lg:text-7xl">
            Inventory that never fails.
          </p>
        </div>
      </section>

      <section
        ref={(node) => {
          sectionRefs.current[2] = node;
        }}
        className="landing-feature relative isolate overflow-hidden bg-[#060a0e]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-black via-[#060a0e] to-transparent sm:h-96" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-24 sm:px-8 sm:pb-28 sm:pt-36 lg:grid-cols-[minmax(0,1.08fr)_minmax(19rem,0.78fr)] lg:items-center lg:gap-20 lg:pb-36 lg:pt-44">
          <div className="landing-drums-image relative aspect-[4/3] overflow-hidden rounded-xl ring-1 ring-white/15">
            <Image
              src="/images/cable-drums.png"
              alt="Yellow and black cable drums stacked in storage"
              fill
              sizes="(min-width: 1024px) 48vw, 100vw"
              className="object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,14,20,0.43)_0%,rgba(8,14,20,0.08)_40%,rgba(8,14,20,0.42)_100%)]" />
          </div>

          <div className="landing-feature-copy max-w-md lg:justify-self-end">
            <h2 className="text-2xl font-semibold leading-[1.06] tracking-[-0.03em] text-white sm:text-4xl">
              Every drum, all in one app.
            </h2>
            <p className="mt-6 text-base leading-7 text-[#C2CEDC] text-justify">
              Keep stock, operational documents, and day-to-day movement connected in one record your team can trust.
            </p>
            <ul className="mt-9 divide-y divide-white/10 border-t border-white/10">
              {inventoryFeatures.map(({ title, description }) => (
                <li key={title} className="flex gap-4 py-5">
                  <span>
                    <span className="block text-sm font-semibold text-white">{title}</span>
                    <span className="mt-1 block text-sm leading-6 text-[#B5C3D4]">{description}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/cables_view"
              className="group mt-9 inline-flex min-h-11 items-center gap-3 rounded-xl border border-[#B9D2FF]/70 px-5 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-[#101821] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#101821]"
            >
              View inventory
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
