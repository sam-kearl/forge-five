# Matters requiring professional review

Nothing here is legal advice, and no item is claimed to be resolved. Each needs sign-off from the right professional (trademark counsel, privacy counsel, or someone who knows current app-store and ad policy) before public release.

## Trademark and naming

| # | Item | Notes |
|---|---|---|
| T1 | **"Forge Five" clearance** | A working name only. A search is needed across app stores, USPTO/EUIPO/UKIPO (classes 9, 28 and 41 at least), domains and social handles. Other number games use forging and ingot themes, so check for confusing similarity. |
| T2 | Tagline "Five numbers. One target. Forge the answer." | Check for conflicts. |
| T3 | Logo mark (five hexes around a glowing point) | Original. Confirm it isn't confusingly similar to existing marks. |
| T4 | Bundle identifiers | `com.example.forgefive` is a placeholder. Choose the final reverse-DNS ids under the publisher's domain. |

## Copyright and originality

| # | Item | Notes |
|---|---|---|
| C1 | Game rules | Arithmetic puzzle mechanics are common. Forge Five's rule text, tutorial, UI, art, sounds, generator and distribution are original (see ORIGINALITY.md). Counsel should confirm no protectable expression from other games was used, and that marketing never describes Forge Five as a version or replacement of another game. |
| C2 | Placeholder app icon and splash PNGs | Still the Expo template images. **Must be replaced.** |
| C3 | Lexend font | OFL 1.1. Include the licence text with the app's notices. The reserved font name must not be used for a modified version. |
| C4 | Transitive build-tool licences (MPL-2.0, CC-BY-4.0) | Confirm they don't appear in the shipped bundle (see LICENSES.md). |

## Privacy (children and general audience)

| # | Item | Notes |
|---|---|---|
| P1 | COPPA status | The app is designed to be suitable for children and collects no personal information. Counsel must decide whether it is "directed to children", then confirm obligations, especially once any ad SDK is added. |
| P2 | GDPR/UK GDPR, the UK Age Appropriate Design Code, and CCPA/CPRA | Confirm no consent flows are needed with the current data practices, and what changes if ads are added. |
| P3 | Privacy policy | PRIVACY_POLICY_OUTLINE.md is a draft outline only. |
| P4 | Store privacy disclosures | The App Store privacy label and Play Data safety must match the final build, including every SDK. |
| P5 | Local streak date | The last solve day is stored locally. Confirm this is not personal data in context (it never leaves the device). |

## Advertising

| # | Item | Notes |
|---|---|---|
| A1 | **Choice of ad provider** | Not chosen. The provider and exact SDK version need compliance review for Apple's Kids Category and age-rating rules, Google Play Families (Families Self-Certified Ads SDK program), COPPA and regional law. |
| A2 | Configuration | Child-directed / under-age treatment flags, non-personalised only, no remarketing, no identifier access (no IDFA / ATT prompt, no AAID use), and the most restrictive content rating. |
| A3 | Placement policy | Home screen always (when not ad-free), and the results screen every 4th solve only. Never during building, never after every puzzle. Confirm this satisfies each store's rules. The ad frame must stay visually distinct from gameplay. |
| A4 | External links | Any ad click-through or external link must sit behind the parental gate if required. The mock has no links. |
| A5 | Ad reporting | A "Report this ad" affordance exists. Wire it to the provider's mechanism, if it has one. |
| A6 | Web ads | Separate review of web ad policies and ad blockers before any web monetisation. Classroom mode must be ad-free. |

## Purchases and parental gate

| # | Item | Notes |
|---|---|---|
| G1 | **Parental gate design** | The current gate asks for three digits written as words. It avoids arithmetic, because children playing a maths game are good at arithmetic. Older children can read, so its strength must be reviewed against current Apple and Google guidance. Stronger alternatives include instructions in words plus a hold gesture, or an adult-oriented question. The component is replaceable (`src/features/parents/`). |
| G2 | Purchase SDK | Not integrated. Choose between StoreKit/Play Billing directly (e.g. via a maintained Expo-compatible library) and a service such as RevenueCat. The latter adds a third-party data flow, so re-review privacy. |
| G3 | Product setup | One non-consumable "remove ads" product in both stores. Restore is required on iOS. Web purchases don't carry over automatically. |
| G4 | Pricing and tax | A business decision. The mock shows a sample price. |

## Accessibility and content

| # | Item | Notes |
|---|---|---|
| X1 | Age rating questionnaires | Answer them with no user-generated content, no chat and no unrestricted web access, and state the ad status honestly. |
| X2 | Accessibility claims | Don't market specific compliance (e.g. WCAG AA) until an audit is done. |
