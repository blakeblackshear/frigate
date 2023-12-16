import Providers from "@/context/providers";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Wrapper from "@/components/Wrapper";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Dashboard from "@/pages/Dashboard";
import Live from "@/pages/Live";
import History from "@/pages/History";
import Export from "@/pages/Export";
import Storage from "@/pages/Storage";
import System from "@/pages/System";
import ConfigEditor from "@/pages/ConfigEditor";
import Logs from "@/pages/Logs";
import NoMatch from "@/pages/NoMatch";
import Settings from "@/pages/Settings";

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
          <div className="grid grid-cols-[auto,1fr] flex-grow-1 overflow-auto">
            <Sidebar sheetOpen={sheetOpen} setSheetOpen={setSheetOpen} />
            <div id="pageRoot" className="overflow-x-hidden px-4 py-2 w-screen md:w-full">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/live" element={<Live />} />
                <Route path="/history" element={<History />} />
                <Route path="/export" element={<Export />} />
                <Route path="/storage" element={<Storage />} />
                <Route path="/system" element={<System />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/config" element={<ConfigEditor />} />
                <Route path="/logs" element={<Logs />} />
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
