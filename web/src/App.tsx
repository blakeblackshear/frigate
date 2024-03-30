import Providers from "@/context/providers";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Wrapper from "@/components/Wrapper";
import Sidebar from "@/components/navigation/Sidebar";

import { isDesktop, isMobile } from "react-device-detect";
import Statusbar from "./components/Statusbar";
import Bottombar from "./components/navigation/Bottombar";
import { Suspense, lazy } from "react";

const Live = lazy(() => import("@/pages/Live"));
const Events = lazy(() => import("@/pages/Events"));
const Export = lazy(() => import("@/pages/Export"));
const Storage = lazy(() => import("@/pages/Storage"));
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
          <div className="size-full pt-2 overflow-hidden">
            {isDesktop && <Sidebar />}
            {isDesktop && <Statusbar />}
            {isMobile && <Bottombar />}
            <div
              id="pageRoot"
              className={`absolute top-0 right-0 overflow-hidden ${isMobile ? "left-0 bottom-16" : "left-12 bottom-8"}`}
            >
              <Suspense>
                <Routes>
                  <Route path="/" element={<Live />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/export" element={<Export />} />
                  <Route path="/storage" element={<Storage />} />
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
