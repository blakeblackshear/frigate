import { WebSocketLike } from "./types";

export interface SharedWebSockets {
  [url: string]: WebSocketLike;
}

export const sharedWebSockets: SharedWebSockets = {};

export const resetWebSockets = (url?: string): void => {
  if (url && sharedWebSockets.hasOwnProperty(url)) {
    delete sharedWebSockets[url];
  } else {
    for (let url in sharedWebSockets){
      if (sharedWebSockets.hasOwnProperty(url)){
        delete sharedWebSockets[url];
      }
    }
  }
}
