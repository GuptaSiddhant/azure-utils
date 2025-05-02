import { useReducer } from "react";
import Button from "./ui/Button";
import Header from "./ui/Header";
import Footer from "./ui/Footer";
import FlagPage from "./FlagPage";
import SideBar from "./Sidebar";
import { useFeatureFlags } from "./hooks/useFeatureFlag";
import { RerenderAppContext } from "./contexts";
import Link from "./ui/Link";

export default function App({
  disconnectAction,
}: {
  disconnectAction: (data: FormData) => void;
}) {
  const [seed, refresh] = useReducer((prev) => prev + 1, 0);
  const featureFlags = useFeatureFlags(seed);

  return (
    <RerenderAppContext.Provider value={refresh}>
      <div className="flex flex-col md:grid md:grid-cols-[300px_1fr] md:grid-rows-[max-content_1fr_max-content] gap-4 justify-center md:h-screen w-screen p-4">
        <Header>
          <button type="button" className="cursor-pointer" onClick={refresh}>
            Refresh
          </button>
        </Header>

        <SideBar featureFlags={featureFlags} />

        <FlagPage />

        <Footer className="col-[1]">
          <div className="grid gap-2 grid-cols-[1fr_max-content]">
            <Link className="w-full" href="#">
              + Create new
            </Link>
            <form action={disconnectAction} className="flex">
              <Button className="text-red-500 w-full justify-center">
                Logout
              </Button>
            </form>
          </div>
        </Footer>
      </div>
    </RerenderAppContext.Provider>
  );
}
