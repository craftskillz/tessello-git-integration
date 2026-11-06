// The Widget (size S): the count, and a way into the View.

import { connect } from "@tessello/sdk";
import { mount } from "svelte";
import "../lib/base.css";
import { applyTheme } from "../lib/theme.ts";
import Widget from "./Widget.svelte";

const host = await connect();
document.documentElement.lang = host.context.locale;
applyTheme(host.context.theme);
host.onThemeChange(applyTheme);

mount(Widget, { target: document.body, props: { host } });
