/**
 * 1. Lower-cases whole email.
 * 2. Removes dots ".".
 * 3. Remotes name part after "+".
 * 4. Throws if cannot parse the email.
 *
 * For example, this email
 *
 *     Michal.Loler+twitter@Gmail.com
 *
 * will be normalized to
 *
 *     michalloler@gmail.com
 *
 */
export declare const normalizeEmail: (email: string) => string;
