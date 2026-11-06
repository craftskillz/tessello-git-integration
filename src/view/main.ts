// The View: the state of the backup and its settings.

import { connect } from "@tessello/sdk";
import { mount } from "svelte";
import { setLocale } from "../lib/i18n.ts";
import "../lib/base.css";
import { applyTheme } from "../lib/theme.ts";
import View from "./View.svelte";

const host = await connect();
setLocale(host.context.locale);
document.documentElement.lang = host.context.locale;
applyTheme(host.context.theme);
host.onThemeChange(applyTheme);

mount(View, { target: document.body, props: { host } });
