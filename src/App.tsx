import { useEffect } from "react";
import { useGameStore } from "./state/store";
import { KobelScreen } from "./ui/screens/KobelScreen";

export function App() {
  useEffect(() => {
    const catchUp = () => useGameStore.getState().catchUp(Date.now());
    // Catch up missed (offline) ticks on start, then keep checking once a
    // second whether the next minute boundary has passed.
    catchUp();
    const interval = setInterval(catchUp, 1_000);
    return () => clearInterval(interval);
  }, []);

  return <KobelScreen />;
}
