// The English and French catalogs of the Git Integration Module. The language follows the `locale` of the handshake;
// English is the default.

const en = {
  title: "Git Integration",
  intro: "Back up your Tessello space to a git repository.",

  section_engine: "Engine",
  section_settings: "Settings",
  section_modules: "Modules whose data is versioned",

  engine_stopped: "The engine is stopped: nothing is being backed up.",
  engine_start_instruction: "Open a terminal in your Modules folder (the folder you chose in Tessello) and run:",
  engine_command: "npx tessello sync",
  copy: "Copy",
  copied: "Copied",
  copy_label: "Copy the command",
  engine_running: "The engine is running.",
  last_commit: "Last commit {when}",
  commit_touching: "touching {modules}",
  no_commit: "No commit yet",
  last_push: "Last push {when}",
  no_push: "No push yet",
  problem_no_config: "Enter the URL of your remote repository to start backing up.",
  problem_generic: "Problem: {message}",

  field_remote: "Remote repository URL",
  field_remote_placeholder: "git@github.com:you/tessello-backup.git",
  field_push: "Push to the remote repository",
  field_interval: "Frequency (seconds)",
  field_interval_hint: "At least 10 seconds, 60 by default.",
  field_interval_error: "Enter a whole number of seconds between 10 and 3600.",

  module_version_data: "Version its data",
  module_new: "New",
  modules_empty: "No Modules installed yet.",
  modules_empty_stopped: "The list appears once the engine has run.",
  modules_secrets_warning:
    "The data of a Module can hold secrets, such as API tokens: only version the data of Modules you trust in your remote repository.",

  time_now: "just now",
  time_minutes: "{count} minutes ago",
  time_minutes_one: "1 minute ago",
  time_hours: "{count} hours ago",
  time_hours_one: "1 hour ago",
  time_days: "{count} days ago",
  time_days_one: "1 day ago",

  module_version_label: "Version the data of {name}",
  save_error: "Your settings could not be saved ({reason}).",
};

type Messages = typeof en;

const fr: Messages = {
  title: "Git Integration",
  intro: "Sauvegardez votre espace Tessello dans un dépôt git.",

  section_engine: "Moteur",
  section_settings: "Réglages",
  section_modules: "Modules dont les données sont versionnées",

  engine_stopped: "Le moteur est arrêté : rien n'est sauvegardé.",
  engine_start_instruction:
    "Ouvrez un terminal dans votre dossier de Modules (le dossier choisi dans Tessello) et lancez :",
  engine_command: "npx tessello sync",
  copy: "Copier",
  copied: "Copié",
  copy_label: "Copier la commande",
  engine_running: "Le moteur tourne.",
  last_commit: "Dernier commit {when}",
  commit_touching: "touchant {modules}",
  no_commit: "Aucun commit pour l'instant",
  last_push: "Dernier push {when}",
  no_push: "Aucun push pour l'instant",
  problem_no_config: "Saisissez l'URL de votre dépôt distant pour démarrer la sauvegarde.",
  problem_generic: "Problème : {message}",

  field_remote: "URL du dépôt distant",
  field_remote_placeholder: "git@github.com:vous/tessello-backup.git",
  field_push: "Pousser vers le dépôt distant",
  field_interval: "Fréquence (secondes)",
  field_interval_hint: "Au moins 10 secondes, 60 par défaut.",
  field_interval_error: "Saisissez un nombre entier de secondes entre 10 et 3600.",

  module_version_data: "Versionner ses données",
  module_new: "Nouveau",
  modules_empty: "Aucun Module installé pour l'instant.",
  modules_empty_stopped: "La liste apparaît dès que le moteur a tourné.",
  modules_secrets_warning:
    "Les données d'un Module peuvent contenir des secrets, comme des jetons d'API : ne versionnez que les données des Modules en lesquels vous avez confiance, dans votre dépôt distant.",

  time_now: "à l'instant",
  time_minutes: "il y a {count} minutes",
  time_minutes_one: "il y a 1 minute",
  time_hours: "il y a {count} heures",
  time_hours_one: "il y a 1 heure",
  time_days: "il y a {count} jours",
  time_days_one: "il y a 1 jour",

  module_version_label: "Versionner les données de {name}",
  save_error: "Vos réglages n'ont pas pu être enregistrés ({reason}).",
};

export type MessageKey = keyof Messages;

let messages: Messages = en;

/** Chooses the catalog for a BCP 47 tag, such as "fr-FR"; English for any other language. */
export function setLocale(locale: string): void {
  messages = locale.toLowerCase().split("-")[0] === "fr" ? fr : en;
}

/** The message in the current language, with each `{name}` replaced by its value. */
export function t(key: MessageKey, values: Record<string, string | number> = {}): string {
  return messages[key].replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}
