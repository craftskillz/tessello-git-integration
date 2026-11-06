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
  problem_push_rejected:
    "The remote repository has commits this machine does not have. Commits go on locally. Settle the conflict by hand in your Modules folder (git pull, resolve, git push): the alert goes away at the next push.",
  problem_auth:
    "git could not authenticate with the remote repository. Check this machine's git access (SSH key or credential helper) by running git push in your Modules folder.",
  problem_remote_unreachable:
    "The remote repository could not be reached. Check its URL and your connection. Commits go on locally and the push is retried each round.",
  problem_git_missing: "git is not installed on this machine. Install it, then run npx tessello sync again.",
  problem_not_a_modules_folder:
    "tessello sync runs in a folder that is not a Modules folder. Run it in the folder you chose in Tessello.",
  problem_since: "since {when}",
  problem_message: "Message from git",

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

  widget_ok: "Up to date",
  widget_alert: "Alert",
  widget_stopped: "Stopped",
  widget_label: "Open Git Integration: {state}, {commit}",

  time_now: "just now",
  time_minutes: "{count} minutes ago",
  time_minutes_one: "1 minute ago",
  time_hours: "{count} hours ago",
  time_hours_one: "1 hour ago",
  time_days: "{count} days ago",
  time_days_one: "1 day ago",

  module_version_label: "Version the data of {name}",
  save_error: "Your settings could not be saved ({reason}).",

  public_warning_none: "Your remote repository is public: anyone can read your backup, including the code of your Modules.",
  public_warning_one: "Your remote repository is public: anyone can read your backup, including the data of 1 Module.",
  public_warning_many: "Your remote repository is public: anyone can read your backup, including the data of {count} Modules.",
  private_recommendation: "Use a private repository: your backup can hold personal data.",
  own_repositories: "These folders have their own git repository and are not versioned here.",

  section_restore: "Restore on another machine",
  restore_step_clone: "In a terminal, run:",
  restore_step_choose: "Open Tessello and click {button} on that folder.",
  restore_choose_button: "Choose a folder…",
  restore_step_sync: "In a terminal, run from the folder that contains it:",
  copy_clone_label: "Copy the clone command",
  copy_sync_label: "Copy the sync command",
  restore_unversioned: "The Modules whose data is not versioned will start empty: {names}.",
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
    "Ouvrez un terminal dans votre Dossier des Modules (le dossier choisi dans Tessello) et lancez :",
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
  problem_push_rejected:
    "Le dépôt distant a des commits que cette machine n'a pas. Les commits continuent en local. Réglez le conflit à la main dans votre Dossier des Modules (git pull, résolution, git push), l'alerte disparaîtra au push suivant.",
  problem_auth:
    "git n'a pas pu s'authentifier auprès du dépôt distant. Vérifiez l'accès git de cette machine (clé SSH ou assistant d'identifiants) en lançant git push dans votre Dossier des Modules.",
  problem_remote_unreachable:
    "Le dépôt distant est injoignable. Vérifiez son URL et votre connexion. Les commits continuent en local et le push est retenté à chaque tour.",
  problem_git_missing: "git n'est pas installé sur cette machine. Installez-le, puis relancez npx tessello sync.",
  problem_not_a_modules_folder:
    "tessello sync tourne dans un dossier qui n'est pas un Dossier des Modules. Lancez-le dans le dossier choisi dans Tessello.",
  problem_since: "depuis {when}",
  problem_message: "Message de git",

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

  widget_ok: "À jour",
  widget_alert: "Alerte",
  widget_stopped: "Arrêté",
  widget_label: "Ouvrir Git Integration : {state}, {commit}",

  time_now: "à l'instant",
  time_minutes: "il y a {count} minutes",
  time_minutes_one: "il y a 1 minute",
  time_hours: "il y a {count} heures",
  time_hours_one: "il y a 1 heure",
  time_days: "il y a {count} jours",
  time_days_one: "il y a 1 jour",

  module_version_label: "Versionner les données de {name}",
  save_error: "Vos réglages n'ont pas pu être enregistrés ({reason}).",

  public_warning_none: "Votre dépôt distant est public : tout le monde peut lire votre sauvegarde, y compris le code de vos Modules.",
  public_warning_one: "Votre dépôt distant est public : tout le monde peut lire votre sauvegarde, y compris les données de 1 Module.",
  public_warning_many: "Votre dépôt distant est public : tout le monde peut lire votre sauvegarde, y compris les données de {count} Modules.",
  private_recommendation: "Utilisez un dépôt privé : votre sauvegarde peut contenir des données personnelles.",
  own_repositories: "Ces dossiers ont leur propre dépôt git et ne sont pas versionnés ici.",

  section_restore: "Restaurer sur une autre machine",
  restore_step_clone: "Dans un terminal, lancez :",
  restore_step_choose: "Ouvrez Tessello et cliquez sur {button} pour ce dossier.",
  restore_choose_button: "Choisir un dossier…",
  restore_step_sync: "Dans un terminal, depuis le dossier qui le contient, lancez :",
  copy_clone_label: "Copier la commande de clonage",
  copy_sync_label: "Copier la commande de synchronisation",
  restore_unversioned: "Les Modules dont les données ne sont pas versionnées démarreront vides : {names}.",
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
