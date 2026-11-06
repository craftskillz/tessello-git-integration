// The View: the state of the backup and its settings.

import { connect } from "@tessello/sdk";
import { mount } from "svelte";
import "../lib/base.css";
import { applyTheme } from "../lib/theme.ts";
import View from "./View.svelte";

const host = await connect();
document.documentElement.lang = host.context.locale;
applyTheme(host.context.theme);
host.onThemeChange(applyTheme);

mount(View, { target: document.body, props: { host } });
