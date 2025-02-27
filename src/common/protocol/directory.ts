export interface DirectoryTree {
  [entry: string]: DirectoryTree | null;
}
