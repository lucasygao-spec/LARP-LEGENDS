# Asset credits

Models and interface sounds are Kenney CC0 assets. Original license texts are preserved in `public/licenses/`.

| Pack | Selected models / use |
| --- | --- |
| [City Kit: Suburban](https://kenney.nl/assets/city-kit-suburban) | building-type-a → Maya's home |
| [City Kit: Commercial](https://kenney.nl/assets/city-kit-commercial) | building-c → bank; building-skyscraper-a → technology; building-f → retail; building-b → financial goal; building-a → home; building-n → apartments; building-skyscraper-b → office; building-j → shops |
| [City Kit: Industrial](https://kenney.nl/assets/city-kit-industrial) | building-a → energy factory; solar-panel-landscape-group → solar field |
| [City Kit: Roads](https://kenney.nl/assets/city-kit-roads) | road-straight and road-crossroad, reused |
| [Blocky Characters](https://kenney.nl/assets/blocky-characters) | character-f → Maya |
| [Nature Kit](https://kenney.nl/assets/nature-kit) | tree_oak, tree_pineRoundA, tree_default, rock_smallA, reused |
| [Interface Sounds](https://kenney.nl/assets/interface-sounds) | click_001, confirmation_001, error_001, back_001 |

Model files are normalized and positioned at runtime. External texture references are renamed by pack, preserving each pack's original texture. No Poly Pizza models are used.

The current scene uses the Commercial pack for all city buildings, including the bank, home, investment districts, and goal building. Shared models reuse their original texture atlas. Custom geometry supplies a flat city base, sidewalks, road markings, crosswalks, a small park, sparse trees, cars, and streetlights. Floating labels and HTML building signs are removed. The financial dashboard and text fallback retain the explanations. Earlier unused island and suburban GLB assets remain in the asset folder but are not loaded by the scene.

Custom financial effects: emergency dome, coin trails, debt drain, and storm lightning. The sidebar portrait is an original inline SVG illustration.

DM Sans and Manrope are bundled from the Google Fonts repository under the SIL Open Font License; the license files ship alongside asset licenses.

Icons: Lucide, ISC license (package license in node_modules/lucide-react/LICENSE).

Animation reference: https://motion.dev/docs/react-animation

Chart reference: https://bklit.com/docs/components/live-line-chart

Implementation guidance used: https://github.com/multica-ai/andrej-karpathy-skills/blob/main/CLAUDE.md
