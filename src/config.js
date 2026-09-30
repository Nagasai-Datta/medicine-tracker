// Every knob in the app lives here. Nothing else hardcodes these values.

// The card colour rolls over at this hour, not midnight.
// A dose taken at 9pm keeps the card green all night; it turns red at 6am.
// Change to 0 for a midnight reset, 5 for a 5am reset, etc.
// This affects COLOUR ONLY. The ledger always files a dose under the real
// calendar date it happened on.
export const DAY_START_HOUR = 6;

// Day boundary is pinned to this zone, not the phone's zone.
export const TIME_ZONE = 'Asia/Kolkata';
export const LOCALE = 'en-IN';

// How many days of history the ledger shows.
export const LEDGER_DAYS = 21;

// Options offered in the add-medicine form. schema.sql allows 1 to 6.
export const DOSE_OPTIONS = [1, 2, 3, 4, 5, 6];

// Every word she reads. Change freely.
export const TEXT = {
  appTitle: 'Medicines',
  taken: 'Taken',
  notTaken: 'Not taken',
  neverTaken: 'No record yet',
  lastTakenPrefix: 'Last taken',
  takeButton: 'I am taking it now',
  takeNextButton: 'I am taking the next one now',
  dosesLeftOne: '1 more to take today',
  dosesLeftMany: (n) => `${n} more to take today`,
  doseCount: (taken, total) => `${taken} of ${total} today`,
  confirmHeading: 'Press done only after you have swallowed the tablet',
  confirmWarning: 'Do not press it before.',
  confirmDone: 'Done',
  confirmBack: 'Go back',
  overrideButton: 'Override',
  overrideHeading: 'Only override if the tablet was NOT taken',
  overrideWarning: 'The record keeps every entry.',
  overrideOnly: 'Override',
  overrideLast: (k) => `Override last ${k} ${k === 1 ? 'dose' : 'doses'}`,
  overrideAll: (n) => `Override all ${n} doses`,
  overriddenTag: (n) => `(overridden ${n})`,
  addMedicine: 'Add a medicine',
  addPlaceholder: 'Medicine name',
  addDosesLabel: 'How many times a day?',
  addSave: 'Save',
  addCancel: 'Cancel',
  ledgerHeading: 'Record',
  emptyMedicines: 'No medicines yet. Add one below.',
  edit: 'Edit',
  editClose: 'Close',
  renameLabel: 'Name',
  renameSave: 'Save name',
  tabActive: 'In use',
  tabArchived: 'Archived',
  archive: 'Archive this medicine',
  archiveConfirm: 'Archive it? It leaves the home screen but the record is kept.',
  archiveYes: 'Yes, archive',
  cancel: 'Cancel',
  unarchive: 'Put it back in use',
  deleteBtn: 'Delete permanently',
  deleteConfirm: (name, n) =>
    `Delete ${name} and all ${n} recorded ${n === 1 ? 'dose' : 'doses'}? This cannot be undone.`,
  deleteYes: 'Yes, delete everything',
  noArchived: 'Nothing archived.',
  noActive: 'No medicines in use.',
  noEntry: 'No entry',
  saving: 'Saving',
};
