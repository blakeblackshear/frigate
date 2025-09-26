
// Type definitions for react-device-detect 2.0.0
// Project: https://github.com/duskload/react-device-detect
// Definitions by: Michael Laktionov <https://github.com/duskload>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.8

declare module "react-device-detect" {
  export import BrowserView = ReactDeviceDetect.BrowserView;
  export import MobileView = ReactDeviceDetect.MobileView;
  export import AndroidView = ReactDeviceDetect.AndroidView;
  export import IEView = ReactDeviceDetect.IEView;
  export import IOSView = ReactDeviceDetect.IOSView;
  export import TabletView = ReactDeviceDetect.TabletView;
  export import WinPhoneView = ReactDeviceDetect.WinPhoneView;
  export import MobileOnlyView = ReactDeviceDetect.MobileOnlyView;
  export import SmartTVView = ReactDeviceDetect.SmartTVView;
  export import ConsoleView = ReactDeviceDetect.ConsoleView;
  export import WearableView = ReactDeviceDetect.WearableView;
  export import CustomView = ReactDeviceDetect.CustomView;
  export import CustomViewProps = ReactDeviceDetect.CustomViewProps;
  export import ViewProps = ReactDeviceDetect.ViewProps;
  export import isBrowser = ReactDeviceDetect.isBrowser;
  export import isDesktop = ReactDeviceDetect.isDesktop;
  export import isMobile = ReactDeviceDetect.isMobile;
  export import isTablet = ReactDeviceDetect.isTablet;
  export import isSmartTV = ReactDeviceDetect.isSmartTV;
  export import isConsole = ReactDeviceDetect.isConsole;
  export import isWearable = ReactDeviceDetect.isWearable;
  export import isEmbedded = ReactDeviceDetect.isEmbedded;
  export import isMobileSafari = ReactDeviceDetect.isMobileSafari;
  export import isChromium = ReactDeviceDetect.isChromium;
  export import isMobileOnly = ReactDeviceDetect.isMobileOnly;
  export import isAndroid = ReactDeviceDetect.isAndroid;
  export import isWinPhone = ReactDeviceDetect.isWinPhone;
  export import isIOS = ReactDeviceDetect.isIOS;
  export import isChrome = ReactDeviceDetect.isChrome;
  export import isFirefox = ReactDeviceDetect.isFirefox;
  export import isSafari = ReactDeviceDetect.isSafari;
  export import isOpera = ReactDeviceDetect.isOpera;
  export import isIE = ReactDeviceDetect.isIE;
  export import isEdge = ReactDeviceDetect.isEdge;
  export import isYandex = ReactDeviceDetect.isYandex;
  export import osVersion = ReactDeviceDetect.osVersion;
  export import osName = ReactDeviceDetect.osName;
  export import fullBrowserVersion = ReactDeviceDetect.fullBrowserVersion;
  export import browserVersion = ReactDeviceDetect.browserVersion;
  export import browserName = ReactDeviceDetect.browserName;
  export import mobileVendor = ReactDeviceDetect.mobileVendor;
  export import mobileModel = ReactDeviceDetect.mobileModel;
  export import engineName = ReactDeviceDetect.engineName;
  export import engineVersion = ReactDeviceDetect.engineVersion;
  export import getUA = ReactDeviceDetect.getUA;
  export import deviceType = ReactDeviceDetect.deviceType;
  export import deviceDetect = ReactDeviceDetect.deviceDetect;
  export import isIOS13 = ReactDeviceDetect.isIOS13;
  export import isIPad13 = ReactDeviceDetect.isIPad13;
  export import isIPhone13 = ReactDeviceDetect.isIPhone13;
  export import isIPod13 = ReactDeviceDetect.isIPod13;
  export import isElectron = ReactDeviceDetect.isElectron;
  export import isEdgeChromium = ReactDeviceDetect.isEdgeChromium;
  export import isLegacyEdge = ReactDeviceDetect.isLegacyEdge;
  export import isWindows = ReactDeviceDetect.isWindows;
  export import isMacOs = ReactDeviceDetect.isMacOs;
  export import withOrientationChange = ReactDeviceDetect.withOrientationChange;
  export import isMIUI = ReactDeviceDetect.isMIUI;
  export import isSamsungBrowser = ReactDeviceDetect.isSamsungBrowser;
  export import OsTypes = ReactDeviceDetect.OsTypes;
  export import BrowserTypes = ReactDeviceDetect.BrowserTypes;
  export import parseUserAgent = ReactDeviceDetect.parseUserAgent;
  export import setUserAgent = ReactDeviceDetect.setUserAgent;
  export import getSelectorsByUserAgent = ReactDeviceDetect.getSelectorsByUserAgent;
  export import useDeviceSelectors = ReactDeviceDetect.useDeviceSelectors;
  export import useDeviceData = ReactDeviceDetect.useDeviceData;
  export import useMobileOrientation = ReactDeviceDetect.useMobileOrientation;
}

declare namespace ReactDeviceDetect {
  export interface ViewProps {
    renderWithFragment?: boolean;
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }

  export interface CustomViewProps {
    renderWithFragment?: boolean;
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    condition?: boolean;
  }

  interface IOsTypes {
    IOS: string;
    Android: string;
    WindowsPhone: string;
    Windows: string;
    MAC_OS: string;
  }

  interface IBrowserTypes {
    Chrome: string;
    Firefox: string;
    Opera: string;
    Yandex: string;
    Safari: string;
    InternetExplorer: string;
    Edge: string;
    Chromium: string;
    Ie: string;
    MobileSafari: string;
    EdgeChromium: string;
    MIUI: string;
    SamsungBrowser: string;
  }

  export function deviceDetect(userAgent: string | undefined): any;

  export function parseUserAgent(userAgent: string | undefined): any;

  export function setUserAgent(userAgent: string): any;

  export function getSelectorsByUserAgent(userAgent: string): any;

  export function useDeviceSelectors(userAgent: string): any;

  export function useDeviceData(userAgent: string): any;

  export function withOrientationChange<P, S = {}>(Component: React.Component<P, S> | React.FC<P>): React.ComponentClass<P, S>;

  export function useMobileOrientation(): { isPortrait: boolean, isLandscape: boolean, orientation: 'portrait' | 'landscape' };

  export class BrowserView extends React.Component<ViewProps> {
  }

  export class MobileView extends React.Component<ViewProps> {
  }

  export class AndroidView extends React.Component<ViewProps> {
  }

  export class IEView extends React.Component<ViewProps> {
  }

  export class IOSView extends React.Component<ViewProps> {
  }

  export class TabletView extends React.Component<ViewProps> {
  }

  export class WinPhoneView extends React.Component<ViewProps> {
  }

  export class MobileOnlyView extends React.Component<ViewProps> {
  }

  export class SmartTVView extends React.Component<ViewProps> {
  }

  export class ConsoleView extends React.Component<ViewProps> {
  }

  export class WearableView extends React.Component<ViewProps> {
  }

  export class CustomView extends React.Component<CustomViewProps> {
  }

  export const isBrowser: boolean;

  export const isDesktop: boolean;

  export const isMobile: boolean;

  export const isTablet: boolean;

  export const isSmartTV: boolean;

  export const isConsole: boolean;

  export const isWearable: boolean;

  export const isEmbedded: boolean;

  export const isMobileSafari: boolean;

  export const isChromium: boolean;

  export const isMobileOnly: boolean;

  export const isAndroid: boolean;

  export const isWinPhone: boolean;

  export const isIOS: boolean;

  export const isChrome: boolean;

  export const isFirefox: boolean;

  export const isSafari: boolean;

  export const isOpera: boolean;

  export const isIE: boolean;

  export const isEdge: boolean;

  export const isYandex: boolean;

  export const osVersion: string;

  export const osName: string;

  export const fullBrowserVersion: string;

  export const browserVersion: string;

  export const browserName: string;

  export const mobileVendor: string;

  export const mobileModel: string;

  export const engineName: string;

  export const engineVersion: string;

  export const getUA: string;

  export const deviceType: string;

  export const isIOS13: boolean;

  export const isIPad13: boolean;

  export const isIPhone13: boolean;

  export const isIPod13: boolean;

  export const isElectron: boolean;

  export const isEdgeChromium: boolean;

  export const isLegacyEdge: boolean;

  export const isWindows: boolean;

  export const isMacOs: boolean;

  export const isMIUI: boolean;

  export const isSamsungBrowser: boolean;

  export const OsTypes: IOsTypes;

  export const BrowserTypes: IBrowserTypes;
}
