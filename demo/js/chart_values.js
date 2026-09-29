/* Generated from data/chart_values.json by tools/check_v2.py --write-js. Edit the JSON, not this file. */
window.PL_DATA = {
 "about": "Machine-readable values shown in the Physis-Lang intro v2. The page reads the mirror js/chart_values.js (identical content; regenerate with tools/check_v2.py --write-js). Every number on screen comes from this file.",
 "paper_commit": "cb5023f5de5f4f904e9e0925f7f37a6bc4364820",
 "packet": "revision_v2_packet/evidence.json + paper_reference/ (sha256-verified against source_manifest.json)",
 "loop": {
  "source_labels": [
   "tab:loop_exact_f1 (figure_tex/loop_exact_f1.tex)",
   "tab:loop_generation_categories (figure_tex/loop_generation_categories.tex)",
   "Sec. 5.3.1 Agentic Caption Evolution (sec/5_experiment_restructured.tex)"
  ],
  "f1_trajectory": {
   "metric": "PhysCapBench F1 (%)",
   "iterations": [
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10
   ],
   "values": [
    78.64,
    76.2775,
    78.0285,
    81.7116,
    81.4992,
    81.1915,
    81.7582,
    81.6271,
    87.8174,
    86.6778
   ],
   "note": "Not monotonic (Iter 2 = 76.28). Iter 9 is the best version and is the one reported. Iter 1 updated to 78.64 to match the user-provided reference screenshot."
  },
  "f1_endpoints": {
   "from_iter": 1,
   "to_iter": 9,
   "from": 78.64,
   "to": 87.8174,
   "display_from": "78.64",
   "display_to": "87.82",
   "display_gain": "+9.18",
   "gain_note": "Gain rounded from 87.8174 - 78.64 = 9.1774, matching the user-provided reference screenshot."
  },
  "generation": {
   "metric": "PhyGenBench overall",
   "iterations": [
    1,
    4,
    8,
    9
   ],
   "values": [
    64.17,
    65.63,
    65.83,
    67.29
   ],
   "display_from": "64.17",
   "display_to": "67.29",
   "display_gain": "+3.12",
   "protocol": "Fixed pretrained Cosmos3-Nano; only the inference captions change, produced with guideline versions from Iter 1 / 4 / 8 / 9. No generator training in this comparison."
  }
 },
 "table6_retrieval": {
  "source_labels": [
   "tab:retrieval_effect (figure_tex/curation_native_pair.tex)",
   "Sec. 5.3.2 Language-Guided Data Curation"
  ],
  "comparison": "WISA vs. WISA + Retrieved (training data)",
  "benchmark_note": "VideoPhy-2 here is the full set (All), not the Hard set used in the radar.",
  "rows": [
   {
    "benchmark": "PhyGenBench",
    "before": 68.12,
    "after": 71.04,
    "gain": 2.92
   },
   {
    "benchmark": "Physics-IQ Verified",
    "before": 40.68,
    "after": 43.41,
    "gain": 2.73
   },
   {
    "benchmark": "VideoPhy-2 All",
    "before": 64.63,
    "after": 68.02,
    "gain": 3.39
   }
  ],
  "mean": {
   "benchmark": "Mean (3 benchmarks)",
   "before": 57.81,
   "after": 60.82,
   "gain": 3.01
  }
 },
 "figure5_categories": {
  "source_labels": [
   "fig:retrieval_category_gains (figure/retrieval_category_gains.pdf)",
   "tab:category_analysis (figure_tex/retrieval_categories_videophy.tex)"
  ],
  "used_on_screen": false,
  "metric": "VideoPhy-2 joint-score gain (percentage points)",
  "protocol": "Multi-label categories on 591 samples; all categories with >= 25 occurrences. Not a one-to-one causal evaluation of individual retrieval buckets.",
  "categories": [
   {
    "name": "Cloth deformation",
    "n": 167,
    "gain": 7.19
   },
   {
    "name": "Fracture mechanics",
    "n": 94,
    "gain": 7.45
   },
   {
    "name": "Elasticity",
    "n": 81,
    "gain": 1.23
   },
   {
    "name": "Chemical processes",
    "n": 50,
    "gain": 8
   },
   {
    "name": "Rigid-body motion",
    "n": 33,
    "gain": 6.06
   },
   {
    "name": "Contact / collision",
    "n": 29,
    "gain": 3.45
   },
   {
    "name": "Soft-body motion",
    "n": 27,
    "gain": 7.41
   },
   {
    "name": "Thermal processes",
    "n": 25,
    "gain": 8
   }
  ]
 },
 "table5_backbones": {
  "source_labels": [
   "tab:backbone_scale (figure_tex/backbone_scale.tex, active rows only)",
   "Sec. 5.2 Generalization across Backbones and Scales"
  ],
  "title": "Gains across backbones and scales",
  "axis": "Mean gain across four benchmarks (points)",
  "benchmark_order": [
   "PhyGenBench",
   "Physics-IQ Verified",
   "VideoPhy-2 All",
   "PhyGround (100-point)"
  ],
  "note": "Mean of four per-benchmark gains on the paper's reported score scales (not relative %). Not every benchmark improves for every model: Edge-4B PhyGround 66.66 -> 66.56. The commented-out Edge row (+1.47) is superseded and not used.",
  "models": [
   {
    "name": "Wan2.1-14B",
    "group": "family",
    "base": [
     56.67,
     27.87,
     57.02,
     61.52
    ],
    "ours": [
     65.83,
     35.15,
     65.65,
     64.64
    ],
    "mean_gain": 7.05
   },
   {
    "name": "Cosmos3-Edge-4B",
    "group": "cosmos",
    "base": [
     48.96,
     32.8,
     32.99,
     66.66
    ],
    "ours": [
     52.5,
     34.69,
     40.61,
     66.56
    ],
    "mean_gain": 3.24
   },
   {
    "name": "Cosmos3-Nano-16B",
    "group": "cosmos",
    "base": [
     61.67,
     40.23,
     60.41,
     65.18
    ],
    "ours": [
     71.04,
     43.41,
     68.02,
     69.9
    ],
    "mean_gain": 6.22
   },
   {
    "name": "Cosmos3-Super-64B",
    "group": "cosmos",
    "base": [
     66.04,
     45.92,
     60.91,
     68.67
    ],
    "ours": [
     70.21,
     50,
     72.42,
     68.98
    ],
    "mean_gain": 5.02
   }
  ]
 },
 "radar": {
  "source_labels": [
   "Teaser radar (assets/teaser_reference.pdf, shown unmodified)",
   "tab:model_comparison_* (figure_tex/sota_main_summary_highlights.tex)"
  ],
  "approved_ours": {
   "PhyGenBench": 71.04,
   "Physics-IQ Verified": 43.41,
   "VideoPhy-2 Hard": 62.36,
   "PhyGround": 69.9
  },
  "release_gate": "Polygons agree with the paper tables, but three outer-ring tick labels (75 / 50 / 70) do not match the plotted scale (about 76.4 / 47.5 / 68.0). Reconcile the original plotting source before export. See data/radar_reconciliation.json."
 },
 "contributions": {
  "source_labels": [
   "sec/1_intro.tex, active contribution bullets 1-3"
  ],
  "items": [
   {
    "short": "Represent physics in language",
    "paper": "Language as a physical world representation"
   },
   {
    "short": "Evolve shared guidelines",
    "paper": "Self-evolving agent system with a physics-aware critic; PhysCapBench guides refinement"
   },
   {
    "short": "Drive targeted data expansion",
    "paper": "Language-guided data engine: physics-domain tags and text-level matching"
   }
  ]
 }
};
