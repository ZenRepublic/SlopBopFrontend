import { Simulation } from './features/simulation/Simulation';
import { Footer } from './primitives/Footer';

function App() {
  return (
    <div className="flex flex-col gap-xl px-md py-lg">
      <div className="flex flex-col gap-md">
        <h1 className="font-display text-2xl">Agentic Simulacra</h1>
        <p className="text-md leading-relaxed">
          Watch the selected synthetic artists find inspiration and create viral songs in the SlopBop residency program.
        </p>
      </div>

      <Simulation />

      <Footer />
    </div>
  );
}

export default App;
