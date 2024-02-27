import Providers from "@/context/providers";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Wrapper from "@/components/Wrapper";
import Sidebar from "@/components/navigation/Sidebar";
import Live from "@/pages/Live";
import Export from "@/pages/Export";
import Storage from "@/pages/Storage";
import System from "@/pages/System";
import ConfigEditor from "@/pages/ConfigEditor";
import Logs from "@/pages/Logs";
import NoMatch from "@/pages/NoMatch";
import Settings from "@/pages/Settings";
import UIPlayground from "./pages/UIPlayground";
import Events from "./pages/Events";
import { isDesktop, isMobile } from "react-device-detect";
import Statusbar from "./components/Statusbar";
import Bottombar from "./components/navigation/Bottombar";

const mobileInsets = "absolute left-0 top-2 right-0 bottom-0 bottom-16"
const desktopInsets = "absolute left-16 top-16 top-2 right-0 bottom-8"

function App() {
  return (
    <Providers>
      <BrowserRouter>
        <Wrapper>
          <div className="w-full h-full pt-2 overflow-hidden">
            {isDesktop && <Sidebar />}
            {isDesktop && <Statusbar />}
            {isMobile && <Bottombar />}
            <div
              id="pageRoot"
              className={`${isDesktop ? desktopInsets : mobileInsets} overflow-hidden`}
            >
              <Routes>
                <Route path="/" element={<Live />} />
                <Route path="/events" element={<Events />} />
                <Route path="/export" element={<Export />} />
                <Route path="/storage" element={<Storage />} />
                <Route path="/system" element={<System />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/config" element={<ConfigEditor />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/playground" element={<UIPlayground />} />
                <Route path="*" element={<NoMatch />} />
              </Routes>
            </div>
          </div>
        </Wrapper>
      </BrowserRouter>
    </Providers>
  );
}

export default App;
