import { useEffect, useState } from 'react';
import { TEXT } from './config';
import { getSession, supabase } from './db';
import { useLedger } from './useLedger';
import MedicineCard from './components/MedicineCard';
import ConfirmDialog from './components/ConfirmDialog';
import OverrideDialog from './components/OverrideDialog';
import AddMedicine from './components/AddMedicine';
import Ledger from './components/Ledger';
import Login from './components/Login';

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    getSession().then(setSession);
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="mt-app mt-loading">Loading</div>;
  if (session === null)
    return (
      <div className="mt-app">
        <h1 className="mt-title">{TEXT.appTitle}</h1>
        <Login onSignedIn={() => getSession().then(setSession)} />
      </div>
    );

  return <Tracker />;
}

function Tracker() {
  const {
    cards,
    medicines,
    events,
    overriddenAt,
    loading,
    error,
    recordDose,
    overrideDoses,
    addMedicine,
    renameMedicine,
    setActive,
    removeMedicine,
  } = useLedger();
  // One dialog for the whole app, not one per card.
  const [confirming, setConfirming] = useState(null);
  const [overriding, setOverriding] = useState(null);

  async function confirm(card) {
    await recordDose(card.id);
    setConfirming(null);
  }

  async function override(doseEventIds) {
    await overrideDoses(doseEventIds);
    setOverriding(null);
  }

  return (
    <div className="mt-app">
      <h1 className="mt-title">{TEXT.appTitle}</h1>

      {error && <div className="mt-error">{error}</div>}
      {loading && <div className="mt-loading">Loading</div>}

      {!loading && cards.length === 0 && (
        <div className="mt-empty">{TEXT.emptyMedicines}</div>
      )}

      {cards.map((card) => (
        <MedicineCard
          key={card.id}
          card={card}
          onTake={setConfirming}
          onOverride={setOverriding}
        />
      ))}

      <AddMedicine onAdd={addMedicine} />

      <Ledger
        medicines={medicines}
        events={events}
        overriddenAt={overriddenAt}
        onRename={renameMedicine}
        onSetActive={setActive}
        onDelete={removeMedicine}
      />

      {confirming && (
        <ConfirmDialog
          card={confirming}
          onConfirm={confirm}
          onCancel={() => setConfirming(null)}
        />
      )}

      {overriding && (
        <OverrideDialog
          card={overriding}
          onConfirm={override}
          onCancel={() => setOverriding(null)}
        />
      )}
    </div>
  );
}
