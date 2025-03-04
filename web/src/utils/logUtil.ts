import { LogLine, LogSeverity, LogType } from "@/types/log";

const pythonSeverity = /(DEBUG)|(INFO)|(WARNING)|(ERROR)/;

const frigateDateStamp = /\[[\d\s-:]*]/;
const frigateSection = /[\w.]*/;

const goSeverity = /(DEB )|(INF )|(WRN )|(ERR )/;
const goSection = /\[[\w]*]/;

const httpMethods = /(GET)|(POST)|(PUT)|(PATCH)|(DELETE)/;

export function parseLogLines(logService: LogType, logs: string[]) {
  if (logService == "frigate") {
    return logs
      .map((line) => {
        const match = frigateDateStamp.exec(line);

        if (!match) {
          const infoIndex = line.indexOf("[INFO]");
          const loggingIndex = line.indexOf("[LOGGING]");

          if (loggingIndex != -1) {
            return {
              dateStamp: line.substring(0, 19),
              severity: "info",
              section: "logging",
              content: line
                .substring(loggingIndex + 9)
                .trim()
                .replace(/\u200b/g, "\n"),
            };
          }

          if (infoIndex != -1) {
            return {
              dateStamp: line.substring(0, 19),
              severity: "info",
              section: "startup",
              content: line
                .substring(infoIndex + 6)
                .trim()
                .replace(/\u200b/g, "\n"),
            };
          }

          return {
            dateStamp: line.substring(0, 19),
            severity: "unknown",
            section: "unknown",
            content: line
              .substring(30)
              .trim()
              .replace(/\u200b/g, "\n"),
          };
        }

        const sectionMatch = frigateSection.exec(
          line.substring(match.index + match[0].length).trim(),
        );

        if (!sectionMatch) {
          return null;
        }

        return {
          dateStamp: match.toString().slice(1, -1),
          severity: pythonSeverity
            .exec(line)
            ?.at(0)
            ?.toString()
            ?.toLowerCase() as LogSeverity,
          section: sectionMatch.toString(),
          content: line
            .substring(line.indexOf(":", match.index + match[0].length) + 2)
            .trim()
            .replace(/\u200b/g, "\n"),
        };
      })
      .filter((value) => value != null) as LogLine[];
  } else if (logService == "go2rtc") {
    return logs
      .map((line) => {
        if (line.length == 0) {
          return null;
        }

        const severity = goSeverity.exec(line);

        let section =
          goSection.exec(line)?.toString()?.slice(1, -1) ?? "startup";

        if (pythonSeverity.exec(section)) {
          section = "startup";
        }

        let contentStart;

        if (section == "startup") {
          if (severity) {
            contentStart = severity.index + severity[0].length;
          } else {
            contentStart = line.lastIndexOf("]") + 1;
          }
        } else {
          contentStart = line.indexOf(section) + section.length + 2;
        }

        if (line.includes("[LOGGING]")) {
          return {
            dateStamp: line.substring(0, 19),
            severity: "info",
            section: "logging",
            content: line.substring(line.indexOf("[LOGGING]") + 9).trim(),
          };
        }

        let severityCat: LogSeverity;
        switch (severity?.at(0)?.toString().trim()) {
          case "INF":
            severityCat = "info";
            break;
          case "WRN":
            severityCat = "warning";
            break;
          case "ERR":
            severityCat = "error";
            break;
          case "DBG":
          case "TRC":
            severityCat = "debug";
            break;
          default:
            severityCat = "info";
        }

        return {
          dateStamp: line.substring(0, 19),
          severity: severityCat,
          section: section,
          content: line.substring(contentStart).trim(),
        };
      })
      .filter((value) => value != null) as LogLine[];
  } else if (logService == "nginx") {
    return logs
      .map((line) => {
        if (line.trim().length === 0) return null;

        // Match full timestamp including nanoseconds
        const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+/;
        const timestampMatch = timestampRegex.exec(line);
        const fullTimestamp = timestampMatch ? timestampMatch[0] : "";
        // Remove nanoseconds from the final output
        const dateStamp = fullTimestamp.split(".")[0];

        if (line.includes("[LOGGING]")) {
          return {
            dateStamp,
            severity: "info",
            section: "logging",
            content: line.slice(line.indexOf("[LOGGING]") + 9).trim(),
          };
        } else if (line.includes("[INFO]")) {
          return {
            dateStamp,
            severity: "info",
            section: "startup",
            content: line.slice(fullTimestamp.length).trim(),
          };
        } else if (line.includes("[error]")) {
          // Error log
          const errorMatch = line.match(/(\[error\].*?,.*request: "[^"]*")/);
          const content = errorMatch ? errorMatch[1] : line;
          return {
            dateStamp,
            severity: "error",
            section: "error",
            content,
          };
        } else if (
          line.includes("GET") ||
          line.includes("POST") ||
          line.includes("HTTP")
        ) {
          // HTTP request log
          const httpMethodMatch = httpMethods.exec(line);
          const section = httpMethodMatch ? httpMethodMatch[0] : "META";
          const contentStart = line.indexOf('"', fullTimestamp.length);
          const content =
            contentStart !== -1 ? line.slice(contentStart).trim() : line;

          return {
            dateStamp,
            severity: "info",
            section,
            content,
          };
        } else {
          // Fallback: unknown format
          return {
            dateStamp,
            severity: "unknown",
            section: "unknown",
            content: line.slice(fullTimestamp.length).trim(),
          };
        }
      })
      .filter((value) => value !== null) as LogLine[];
  }

  return [];
}
