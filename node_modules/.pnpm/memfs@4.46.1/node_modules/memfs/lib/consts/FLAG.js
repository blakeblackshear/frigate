"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLAG = void 0;
/**
 * Constants used in `open` system calls, see [open(2)](http://man7.org/linux/man-pages/man2/open.2.html).
 *
 * These constants are compatible with Node.js fs constants and can be used with both
 * memfs and native Node.js fs.promises.open().
 *
 * @see http://man7.org/linux/man-pages/man2/open.2.html
 * @see https://www.gnu.org/software/libc/manual/html_node/Open_002dtime-Flags.html
 */
var FLAG;
(function (FLAG) {
    FLAG[FLAG["O_RDONLY"] = 0] = "O_RDONLY";
    FLAG[FLAG["O_WRONLY"] = 1] = "O_WRONLY";
    FLAG[FLAG["O_RDWR"] = 2] = "O_RDWR";
    FLAG[FLAG["O_ACCMODE"] = 3] = "O_ACCMODE";
    FLAG[FLAG["O_CREAT"] = 64] = "O_CREAT";
    FLAG[FLAG["O_EXCL"] = 128] = "O_EXCL";
    FLAG[FLAG["O_NOCTTY"] = 256] = "O_NOCTTY";
    FLAG[FLAG["O_TRUNC"] = 512] = "O_TRUNC";
    FLAG[FLAG["O_APPEND"] = 1024] = "O_APPEND";
    FLAG[FLAG["O_NONBLOCK"] = 2048] = "O_NONBLOCK";
    FLAG[FLAG["O_DSYNC"] = 4096] = "O_DSYNC";
    FLAG[FLAG["FASYNC"] = 8192] = "FASYNC";
    FLAG[FLAG["O_DIRECT"] = 16384] = "O_DIRECT";
    FLAG[FLAG["O_LARGEFILE"] = 0] = "O_LARGEFILE";
    FLAG[FLAG["O_DIRECTORY"] = 65536] = "O_DIRECTORY";
    FLAG[FLAG["O_NOFOLLOW"] = 131072] = "O_NOFOLLOW";
    FLAG[FLAG["O_NOATIME"] = 262144] = "O_NOATIME";
    FLAG[FLAG["O_CLOEXEC"] = 524288] = "O_CLOEXEC";
    FLAG[FLAG["O_SYNC"] = 1052672] = "O_SYNC";
    FLAG[FLAG["O_NDELAY"] = 2048] = "O_NDELAY";
})(FLAG || (exports.FLAG = FLAG = {}));
//# sourceMappingURL=FLAG.js.map