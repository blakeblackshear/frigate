import { devUtils } from '~/core/utils/internal/devUtils'
import { StartOptions } from '../../glossary'

export function validateWorkerScope(
  registration: ServiceWorkerRegistration,
  options?: StartOptions,
): void {
  if (!options?.quiet && !location.href.startsWith(registration.scope)) {
    devUtils.warn(
      `\
Cannot intercept requests on this page because it's outside of the worker's scope ("${registration.scope}"). If you wish to mock API requests on this page, you must resolve this scope issue.

- (Recommended) Register the worker at the root level ("/") of your application.
- Set the "Service-Worker-Allowed" response header to allow out-of-scope workers.\
`,
    )
  }
}
