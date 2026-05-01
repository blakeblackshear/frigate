# Contributing to Frigate

Thank you for your interest in contributing to Frigate. This document covers the expectations and guidelines for contributions. Please read it before submitting a pull request.

## Before you start

### Bugfixes

If you've found a bug and want to fix it, go for it. Link to the relevant issue in your PR if one exists, or describe the bug in the PR description.

### New features

A pull request is more than just code — it's a request for the maintainers to review, integrate, and support the change long-term. We're selective about what we take on, and prioritize changes that align with the project's direction and can be responsibly maintained in the long term.

This goes double for **large or highly-requested features**. Popularity signals demand, but it doesn't pre-approve a particular implementation. The bigger the change, the higher the long-term cost, and the more important it is that we're aligned on scope and approach before any code is written. A large PR that lands without prior discussion is unlikely to be merged as-is, no matter how well it's implemented.

Before writing code for a new feature:

1. **Check for existing discussion.** Search [feature requests](https://github.com/blakeblackshear/frigate/issues) and [discussions](https://github.com/blakeblackshear/frigate/discussions) to see if it's been proposed or discussed. Feature requests tagged with "planned" are on our radar — we plan to get to them, but we don't maintain a public roadmap or timeline. Check in with us first if you have interest in contributing to one.
2. **Start a discussion or feature request first.** This helps ensure your idea aligns with Frigate's direction before you invest time building it. Community interest in a feature request helps us gauge demand, though a great idea is a great idea even without a crowd behind it.

## AI usage policy

AI tools are a reality of modern development and we're not opposed to their use. But we need to understand your relationship with the code you're submitting. The more AI was involved, the more important it is that you've genuinely reviewed, tested, and understood what it produced.

### Requirements when AI is used

If AI is used to generate any portion of the code, contributors must adhere to the following requirements:

1. **Explicitly disclose the manner in which AI was employed.** The PR template asks for this. Be honest — this won't automatically disqualify your PR. We'd rather have an honest disclosure than find out later. Trust matters more than method.
2. **Perform a comprehensive manual review prior to submitting the pull request.** Don't submit code you haven't read carefully and tested locally.
3. **Be prepared to explain every line of code they submitted when asked about it by a maintainer.** If you can't explain why something works the way it does, you're not ready to submit it.
4. **It is strictly prohibited to use AI to write your posts for you** (bug reports, feature requests, pull request descriptions, GitHub discussions, responding to humans, etc.). We need to hear from _you_, not your AI assistant. These are the spaces where we build trust and understanding with contributors, and that only works if we're talking to each other.

### Established contributors

Contributors with a long history of thoughtful, quality contributions to Frigate have earned trust through that track record. The level of scrutiny we apply to AI usage naturally reflects that trust. This isn't a formal exemption — it's just how trust works. If you've been around, we know how you think and how you work. If you're new, we're still getting to know you, and clear disclosure helps build that relationship.

### What this means in practice

We're not trying to gatekeep how you write code. Use whatever tools make you productive. But there's a difference between using AI as a tool to implement something you understand and handing a feature request to an AI and submitting whatever comes back. The former is fine. The latter creates maintenance risk for the project.

Some honest context: when we review a PR, we're not just evaluating whether the code works today. We're evaluating whether we can maintain it, debug it, and extend it long-term — often without the original author's involvement. Code that the author doesn't deeply understand is code that nobody understands, and that's a liability.

One more thing worth saying directly: most maintainers already have access to the same AI tools you do. A PR that's entirely AI-generated — where the author can't explain the design, debug issues independently, or engage substantively in design discussions — doesn't offer something we couldn't produce ourselves. What makes a contribution genuinely valuable is the human judgment, domain understanding, and ongoing commitment to maintain the code that comes with it.

## Pull request guidelines

### Before submitting

- **Search for existing PRs** to avoid duplicating effort.
- **Test your changes locally.** Your PR cannot be merged unless tests pass.
- **Format your code.** Run `ruff format frigate` for Python and `npm run prettier:write` from the `web/` directory for frontend changes.
- **Run the linter.** Run `ruff check frigate` for Python and `npm run lint` from `web/` for frontend.
- **One concern per PR.** Don't combine unrelated changes. A bugfix and a new feature should be separate PRs.

### What we look for in review

- **Does it work?** Tested locally, tests pass, no regressions.
- **Is it maintainable?** Clear code, appropriate complexity, good separation of concerns.
- **Does it fit?** Consistent with Frigate's architecture and design philosophy.
- **Is it scoped well?** Solves the stated problem without unnecessary additions.

### After submitting

- Be responsive to review feedback. We may ask for changes.
- Expect honest, direct feedback. We try to be respectful but we also try to be efficient.
- If your PR goes stale, rebase it on the latest `dev` branch.

## Coding standards

### Python (backend)

- **Python** — use modern language features (type hints, pattern matching, f-strings, dataclasses)
- **Formatting**: Ruff (configured in `pyproject.toml`)
- **Linting**: Ruff
- **Testing**: `python3 -u -m unittest`
- **Logging**: Use module-level `logger = logging.getLogger(__name__)` with lazy formatting
- **Async**: All external I/O must be async. No blocking calls in async functions.
- **Error handling**: Use specific exception types. Keep try blocks minimal.
- **Language**: American English for all code, comments, and documentation

### TypeScript/React (frontend)

- **Linting**: ESLint (`npm run lint` from `web/`)
- **Formatting**: Prettier (`npm run prettier:write` from `web/`)
- **Type safety**: TypeScript strict mode. Avoid `any`.
- **i18n**: All user-facing strings must use `react-i18next`. Never hardcode display text in components. Add English strings to the appropriate files in `web/public/locales/en/`.
- **Components**: Use Radix UI/shadcn primitives and TailwindCSS with the `cn()` utility.

### Development commands

```bash
# Python
python3 -u -m unittest                              # Run all tests
python3 -u -m unittest frigate.test.test_ffmpeg_presets  # Run specific test
ruff format frigate                                  # Format
ruff check frigate                                   # Lint

# Frontend (from web/ directory)
npm run build                                        # Build
npm run lint                                         # Lint
npm run lint:fix                                     # Lint + fix
npm run prettier:write                               # Format
```

## Project structure

```
frigate/           # Python backend
  api/             # FastAPI route handlers
  config/          # Configuration parsing and validation
  detectors/       # Object detection backends
  events/          # Event management and storage
  test/            # Backend tests
  util/            # Shared utilities
web/               # React/TypeScript frontend
  src/
    api/           # API client functions
    components/    # Reusable components
    hooks/         # Custom React hooks
    pages/         # Route components
    types/         # TypeScript type definitions
    views/         # Complex view components
docker/            # Docker build files
docs/              # Documentation site
migrations/        # Database migrations
```

## Translations

Frigate uses [Weblate](https://hosted.weblate.org/projects/frigate-nvr/) for managing language translations. If you'd like to help translate Frigate into your language:

1. Visit the [Frigate project on Weblate](https://hosted.weblate.org/projects/frigate-nvr/).
2. Create an account or log in.
3. Browse the available languages and select the one you'd like to contribute to, or request a new language.
4. Translate strings directly in the Weblate interface — no code changes or pull requests needed.

Translation contributions through Weblate are automatically synced to the repository. Please do not submit pull requests for translation changes — use Weblate instead so that translations are properly tracked and coordinated.

## Resources

- [Documentation](https://docs.frigate.video)
- [Discussions, Support, and Bug Reports](https://github.com/blakeblackshear/frigate/discussions)
- [Feature Requests](https://github.com/blakeblackshear/frigate/issues)
