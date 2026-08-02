import { BRAND } from "@/lib/brand";
import { TopicHeroInput } from "@/components/onboarding/TopicHeroInput";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-[1180px] px-6">
      <header className="mb-2 mt-9 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[19px] font-bold tracking-tight">
          <div className="cyt-gradient-bg grid h-[30px] w-[30px] place-items-center rounded-[9px] font-extrabold text-bg">
            {BRAND.MARK}
          </div>
          {BRAND.APP_NAME}
        </div>
        <nav className="flex gap-[18px] text-[13.5px] text-mut">
          <span>How it works</span>
          <span>Pricing</span>
          <span>Sign in</span>
        </nav>
      </header>

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
