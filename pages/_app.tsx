import * as React from "react";
import type { AppProps } from "next/app";
import { CacheProvider, EmotionCache } from "@emotion/react";
import { ThemeProvider, CssBaseline, createTheme } from "@mui/material";

import createEmotionCache from "../util/createEmotionCache";
import lightThemeOptions from "../styles/theme/lightThemeOptions";
import darkThemeOptions from "../styles/theme/darkThemeOptions";
import "../styles/globals.css";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
}

const clientSideEmotionCache = createEmotionCache();

const theme = (isLightTheme: boolean) =>
  createTheme(isLightTheme ? lightThemeOptions : darkThemeOptions);

const MyApp: React.FunctionComponent<MyAppProps> = (props) => {
  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props;
  const [isLightTheme, setIsLightTheme] = React.useState<boolean>(true);

  return (
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={theme(isLightTheme)}>
        <CssBaseline />
        <Component {...pageProps} />
      </ThemeProvider>
    </CacheProvider>
  );
};

export default MyApp;
