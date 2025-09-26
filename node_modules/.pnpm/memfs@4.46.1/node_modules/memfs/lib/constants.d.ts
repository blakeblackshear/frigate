export declare const SEP = "/";
export declare const enum PATH {
    SEP = "/"
}
export declare const constants: {
    O_RDONLY: number;
    O_WRONLY: number;
    O_RDWR: number;
    S_IFMT: number;
    S_IFREG: number;
    S_IFDIR: number;
    S_IFCHR: number;
    S_IFBLK: number;
    S_IFIFO: number;
    S_IFLNK: number;
    S_IFSOCK: number;
    O_CREAT: number;
    O_EXCL: number;
    O_NOCTTY: number;
    O_TRUNC: number;
    O_APPEND: number;
    O_DIRECTORY: number;
    O_NOATIME: number;
    O_NOFOLLOW: number;
    O_SYNC: number;
    O_SYMLINK: number;
    O_DIRECT: number;
    O_NONBLOCK: number;
    S_IRWXU: number;
    S_IRUSR: number;
    S_IWUSR: number;
    S_IXUSR: number;
    S_IRWXG: number;
    S_IRGRP: number;
    S_IWGRP: number;
    S_IXGRP: number;
    S_IRWXO: number;
    S_IROTH: number;
    S_IWOTH: number;
    S_IXOTH: number;
    F_OK: number;
    R_OK: number;
    W_OK: number;
    X_OK: number;
    UV_FS_SYMLINK_DIR: number;
    UV_FS_SYMLINK_JUNCTION: number;
    UV_FS_COPYFILE_EXCL: number;
    UV_FS_COPYFILE_FICLONE: number;
    UV_FS_COPYFILE_FICLONE_FORCE: number;
    COPYFILE_EXCL: number;
    COPYFILE_FICLONE: number;
    COPYFILE_FICLONE_FORCE: number;
};
export declare const enum S {
    ISUID = 2048,//  (04000)  set-user-ID (set process effective user ID on execve(2))
    ISGID = 1024,// (02000)  set-group-ID (set process effective group ID on execve(2); mandatory locking, as described in fcntl(2); take a new file's group from parent directory, as described in chown(2) and mkdir(2))
    ISVTX = 512,// (01000)  sticky bit (restricted deletion flag, as described in unlink(2))
    IRUSR = 256,//  (00400)  read by owner
    IWUSR = 128,// (00200)  write by owner
    IXUSR = 64,// (00100)  execute/search by owner
    IRGRP = 32,// (00040)  read by group
    IWGRP = 16,// (00020)  write by group
    IXGRP = 8,// (00010)  execute/search by group
    IROTH = 4,// (00004)  read by others
    IWOTH = 2,//  (00002)  write by others
    IXOTH = 1
}
