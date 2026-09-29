/* Physis-Lang intro v2 — the single source of timing.
 * Scene windows, video groups and named cues (seconds on the master timeline).
 * index.html refers to cues by name, e.g. data-in="c.step2" or data-in="c.step2+0.6".
 * tools/check_v2.py reads the JSON between the markers to validate subtitles and reading time.
 */
window.PL_TIMELINE = /*JSON-BEGIN*/{
  "duration": 123.8,
  "scenes": [
    {
      "id": "sA",
      "label": "Butter",
      "start": 0.0,
      "end": 10.0,
      "fi": 0.0,
      "fo": 0.4
    },
    {
      "id": "sB",
      "label": "Cause-Law-Effect",
      "start": 10.0,
      "end": 22.7,
      "fi": 0.45,
      "fo": 0.4
    },
    {
      "id": "sC",
      "label": "Guideline loop",
      "start": 22.7,
      "end": 56.8,
      "fi": 0.45,
      "fo": 0.4
    },
    {
      "id": "sD",
      "label": "Retrieval",
      "start": 56.8,
      "end": 77.3,
      "fi": 0.45,
      "fo": 0.4
    },
    {
      "id": "sE",
      "label": "Benchmarks",
      "start": 77.3,
      "end": 86.1,
      "fi": 0.45,
      "fo": 0.4
    },
    {
      "id": "sF",
      "label": "Backbones",
      "start": 86.1,
      "end": 97.6,
      "fi": 0.45,
      "fo": 0.4
    },
    {
      "id": "sG",
      "label": "Showcase",
      "start": 97.6,
      "end": 114.27,
      "fi": 0.45,
      "fo": 0.4
    },
    {
      "id": "sH",
      "label": "Takeaway",
      "start": 114.27,
      "end": 123.8,
      "fi": 0.45,
      "fo": 0.0
    }
  ],
  "videoGroups": [
    {
      "name": "butter",
      "start": 0.0,
      "videos": [
        "vBase",
        "vOurs"
      ]
    },
    {
      "name": "show12",
      "start": 97.95,
      "videos": [
        "sc12"
      ]
    },
    {
      "name": "show14",
      "start": 101.22,
      "videos": [
        "sc14"
      ]
    },
    {
      "name": "show15",
      "start": 104.52,
      "videos": [
        "sc15"
      ]
    },
    {
      "name": "show16",
      "start": 107.82,
      "videos": [
        "sc16"
      ]
    },
    {
      "name": "show18",
      "start": 111.12,
      "videos": [
        "sc18"
      ]
    }
  ],
  "cues": {
    "a.outcome": 4.2,
    "b.title": 10.1,
    "b.conv": 10.5,
    "b.pl": 11.3,
    "b.cause": 11.5,
    "b.law": 12.8,
    "b.effect": 14.1,
    "b.all": 15.4,
    "c.statement": 22.8,
    "c.diagram": 23.2,
    "c.step1": 25.2,
    "c.step2": 32.5,
    "c.step3": 37.5,
    "c.step4": 42.8,
    "c.outcome": 48.0,
    "d.title": 56.9,
    "d.s1": 57.5,
    "d.s2": 59.5,
    "d.s3": 61.5,
    "d.match": 62.2,
    "d.s4": 63.5,
    "d.s5": 65.3,
    "d.table": 67.2,
    "e.title": 77.4,
    "e.radar": 77.5,
    "e.note": 78.2,
    "f.title": 86.2,
    "f.axis": 86.5,
    "f.bars": 86.9,
    "f.values": 87.8,
    "f.note": 88.3,
    "g.title": 97.6,
    "g.slot1": 97.8,
    "g.slot2": 101.07,
    "g.slot3": 104.37,
    "g.slot4": 107.67,
    "g.slot5": 110.97,
    "g.end": 114.27,
    "h.p1": 114.47,
    "h.p2": 114.97,
    "h.p3": 115.47,
    "h.sentence": 116.17
  }
}/*JSON-END*/;
