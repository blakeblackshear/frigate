import Providers from "@/context/providers";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Wrapper from "@/components/Wrapper";
import Sidebar from "@/components/navigation/Sidebar";

import { isDesktop, isMobile } from "react-device-detect";
import Statusbar from "./components/Statusbar";
import Bottombar from "./components/navigation/Bottombar";
import { Suspense, lazy } from "react";
import { Redirect } from "./components/navigation/Redirect";
import { cn } from "./lib/utils";
import { isPWA } from "./utils/isPWA";

const Live = lazy(() => import("@/pages/Live"));
const Events = lazy(() => import("@/pages/Events"));
const Exports = lazy(() => import("@/pages/Exports"));
const SubmitPlus = lazy(() => import("@/pages/SubmitPlus"));
const ConfigEditor = lazy(() => import("@/pages/ConfigEditor"));
const System = lazy(() => import("@/pages/System"));
const Settings = lazy(() => import("@/pages/Settings"));
const UIPlayground = lazy(() => import("@/pages/UIPlayground"));
const Logs = lazy(() => import("@/pages/Logs"));
const NoMatch = lazy(() => import("@/pages/NoMatch"));

function App() {
  return (
    <Providers>
      <BrowserRouter>
        <Wrapper>
          <div className="size-full overflow-hidden">
            {isDesktop && <Sidebar />}
            {isDesktop && <Statusbar />}
            {isMobile && <Bottombar />}
            <div
              id="pageRoot"
              className={cn(
                "absolute right-0 top-0 overflow-hidden",
                isMobile
                  ? `bottom-${isPWA ? 16 : 12} left-0 md:bottom-16 landscape:bottom-14 landscape:md:bottom-16`
                  : "bottom-8 left-[52px]",
              )}
            >
              <Suspense>
                <Routes>
                  <Route path="/" element={<Live />} />
                  <Route path="/events" element={<Redirect to="/review" />} />
                  <Route path="/review" element={<Events />} />
                  <Route path="/export" element={<Exports />} />
                  <Route path="/plus" element={<SubmitPlus />} />
                  <Route path="/system" element={<System />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/config" element={<ConfigEditor />} />
                  <Route path="/logs" element={<Logs />} />
                  <Route path="/playground" element={<UIPlayground />} />
                  <Route path="*" element={<NoMatch />} />
                </Routes>
              </Suspense>
            </div>
          </div>
        </Wrapper>
      </BrowserRouter>
    </Providers>
  );
}

export default App;
