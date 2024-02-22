import Providers from "@/context/providers";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Wrapper from "@/components/Wrapper";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
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
import { isDesktop } from "react-device-detect";
import Statusbar from "./components/Statusbar";

function App() {
  const [sheetOpen, setSheetOpen] = useState(false);

  const toggleNavbar = () => {
    setSheetOpen((prev) => !prev);
  };

  return (
    <Providers>
      <BrowserRouter>
        <Wrapper>
          <Header onToggleNavbar={toggleNavbar} />
          <div className="w-full h-full pt-2 overflow-hidden">
            <Sidebar sheetOpen={sheetOpen} setSheetOpen={setSheetOpen} />
            {isDesktop && <Statusbar />}
            <div
              id="pageRoot"
              className="absolute left-0 md:left-16 top-16 md:top-2 right-0 bottom-0 md:bottom-8 overflow-hidden"
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
