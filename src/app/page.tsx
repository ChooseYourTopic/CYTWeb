import { BRAND } from "@/lib/brand";
import { TopicHeroInput } from "@/components/onboarding/TopicHeroInput";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-[1180px] px-6">
      <SiteHeader />

      <section className="pb-8 pt-16 text-center">
        <h1 className="mx-auto text-[46px] font-bold leading-[1.05] tracking-[-1.2px]">
          One line to start.
          <br />
          <span className="cyt-gradient-text">Then watch it build itself.</span>
        </h1>
        <p className="mx-auto my-4 max-w-[640px] text-[18px] text-mut">
          {BRAND.SUBTAGLINE}
        </p>

        <div className="mt-7">
          <TopicHeroInput />
        </div>
      </section>

      <footer className="my-9 text-center text-[12px] text-dim">
        {BRAND.APP_NAME} · the real build runs on our own engine, clean-room, on
        our own droplet.
      </footer>
    </main>
  );
}
