import ContentAnimation from '@/components/layouts/content-animation';
import Footer from '@/components/layouts/footer';
import Header from '@/components/layouts/header';
import MainContainer from '@/components/layouts/main-container';
import Overlay from '@/components/layouts/overlay';
import ScrollToTop from '@/components/layouts/scroll-to-top';
import Sidebar from '@/components/layouts/sidebar';
import Portals from '@/components/portals';
import DemoBanner from '@/components/demo-banner';

export default function DefaultLayout({
  children,
  isDemo = false,
}: {
  children: React.ReactNode;
  isDemo?: boolean;
}) {
  return (
    <>
      {/* BEGIN MAIN CONTAINER */}
      <div className="relative">
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[1000] -translate-y-24 rounded-lg bg-primary px-4 py-2 font-medium text-white transition-transform focus:translate-y-0"
        >
          Saltar al contenido principal
        </a>
        <DemoBanner active={isDemo} />
        <Overlay />
        <ScrollToTop />

        {/* BEGIN APP SETTING LAUNCHER */}
        {/* <Setting /> Removed per user request */}
        {/* END APP SETTING LAUNCHER */}

        <MainContainer>
          {/* BEGIN SIDEBAR */}
          <Sidebar />
          {/* END SIDEBAR */}
          <div className="main-content flex min-h-[100dvh] flex-col">
            {/* BEGIN TOP NAVBAR */}
            <Header />
            {/* END TOP NAVBAR */}

            {/* BEGIN CONTENT AREA */}
            <div>
              <ContentAnimation>{children}</ContentAnimation>
            </div>
            {/* END CONTENT AREA */}

            {/* BEGIN FOOTER */}
            <Footer />
            {/* END FOOTER */}
            <Portals />
          </div>
        </MainContainer>
      </div>
    </>
  );
}
