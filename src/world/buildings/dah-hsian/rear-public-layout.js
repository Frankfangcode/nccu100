import {widenPublicWc} from './wc-clearance-layout.js';
import {COMMONS_STEP_WINDOW,COMMONS_STEP_CORNER} from './commons-step-layout.js';
/** Official column-registered 3/4/5/7F public areas and room fronts.
 * Source plans are linked per floor. Lines/door centers are manual photo/plan
 * estimates; furniture centers are samples, not exact counts or surveyed metres.
 * Heights, materials and MF/6F rear plans remain unverified.
 */
export const SOURCE_REAR_LAYOUT={
 "3F": {
  "source": "https://sub.lib.nccu.edu.tw/map/imgs/dhl3f.jpg",
  "regions": [
   COMMONS_STEP_CORNER,
   [[-15.126,-22],[-14.7,-22],[-14.7,-14.623],[-15.126,-14.623]],
   [[-14.958,-23.677],[-12.048,-22.587],[-11.626,-23.635],[-8.506,-22.587],[-8.211,-23.677],[-8.211,-21.6],[-14.958,-21.6]],
   [
    [
     -14.747,
     -21.707
    ],
    [
     -8.253,
     -21.707
    ],
    [
     -8.253,
     -4.353
    ],
    [
     -12.892,
     -4.353
    ],
    [
     -12.892,
     -4.605
    ],
    [
     -14.452,
     -4.605
    ],
    [
     -14.452,
     -8.168
    ],
    [
     -14.747,
     -8.168
    ]
   ],
   [
    [
     -30.139,
     -14.581
    ],
    [
     -22.337,
     -14.581
    ],
    [
     -22.337,
     -1.21
    ],
    [
     -30.139,
     -1.21
    ]
   ],
   [
    [
     -21.831,
     -14.413
    ],
    [
     -8.253,
     -14.413
    ],
    [
     -8.253,
     -8.252
    ],
    [
     -21.831,
     -8.252
    ]
   ],
   [
    [
     -30.139,
     -0.79
    ],
    [
     -22.675,
     -0.79
    ],
    [
     -22.675,
     1.347
    ],
    [
     -17.53,
     1.347
    ],
    [
     -17.53,
     6.126
    ],
    [
     -15.422,
     6.126
    ],
    [
     -15.422,
     7.257
    ],
    [
     -9.012,
     13.126
    ],
    [
     -24.91,
     13.126
    ],
    [
     -24.91,
     4.91
    ]
   ],
   [
    [
     -19.722,
     -14.575
    ],
    [
     -18.461,
     -14.575
    ],
    [
     -18.461,
     -16.477
    ],
    [
     -16.654,
     -16.477
    ],
    [
     -16.654,
     -17.312
    ],
    [
     -21.571,
     -17.312
    ],
    [
     -21.571,
     -16.477
    ],
    [
     -19.722,
     -16.477
    ]
   ],
   [
    [
     -19.722,
     -14.674999999999999
    ],
    [
     -18.461,
     -14.674999999999999
    ],
    [
     -18.461,
     -13.975
    ],
    [
     -19.722,
     -13.975
    ]
   ]
  ],
  "exclusions": [
   {
    "kind": "closedStairCore",
    "points": [
     [
      -29.759,
      -6.156
     ],
     [
      -27.229,
      -6.156
     ],
     [
      -27.229,
      -2.886
     ],
     [
      -29.759,
      -2.886
     ]
    ]
   }
  ],
  "fronts": [
   {
    "id": "north_machine_south",
    "axis": "x",
    "fixed": -15.168,
    "lo": 2.289,
    "hi": 13.084,
    "face": 1,
    "doorCenters": []
   },
   {
    "id": "east_archive_west",
    "axis": "z",
    "fixed": 2.5,
    "lo": -12.359,
    "hi": 12.665,
    "face": -1,
    "doorCenters": []
   },
   {
    "id": "east_archive_north",
    "axis": "x",
    "fixed": -12.401,
    "lo": 2.5,
    "hi": 16.374,
    "face": -1,
    "doorCenters": []
   },
   {
    "id": "east_archive_south",
    "axis": "x",
    "fixed": 13.042,
    "lo": 2.5,
    "hi": 13.759,
    "face": 1,
    "doorCenters": []
   },
   {
    "id": "wc_south_front",
    "axis": "x",
    "fixed": -14.623,
    "lo": -22,
    "hi": -15.126,
    "face": 1,
    "doorCenters": []
   },
   {
    "id": "b_core_north",
    "axis": "x",
    "fixed": -7.958,
    "lo": -22.042,
    "hi": -15.042,
    "face": -1,
    "doorCenters": []
   }
  ],
  "diagonal": null,
  "windows": {
   "axis": "x",
   "fixed": 19.958,
   "lo": -8,
   "hi": 12.958,
   "sourceDerivativePixels": [
    [
     556,
     1101
    ],
    [
     1053,
     1101
    ]
   ],
   "outwardFace": 1,
   "kind": "source exterior window-wall run interrupted by columns/piers; exact sill/head/mullion rhythm unknown",
   "notGuard": true,
   "uncertainty": "line location manual +/-3 derivative px; no full-height glazing guarantee; no source proof every bay opens"
  },
  "outerEdges": [
   COMMONS_STEP_WINDOW,
   {
    "id": "west_commons_exterior",
    "points": [
     [
      -30.518,
      -14.916
     ],
     [
      -30.518,
      -1.084
     ]
    ],
    "kind": "exterior window-wall line, west-facing; interrupt with real columns; exact opaque/glass subdivisions unknown"
   },
   {
    "id": "west_commons_north_return",
    "points": [
     [
      -30.518,
      -15.126
     ],
     [
      -22.169,
      -15.126
     ]
    ],
    "kind": "north-facing outer window-wall of western learning wing; not along image top or C row"
   },
   {
    "id": "commons_north_sawtooth",
    "points": [
     [
      -14.958,
      -23.677
     ],
     [
      -12.048,
      -22.587
     ],
     [
      -11.626,
      -23.635
     ],
     [
      -8.506,
      -22.587
     ],
     [
      -8.211,
      -23.677
     ]
    ],
    "kind": "north outer sawtooth line across open commons bay; frame/sill/head and glass versus opaque share unknown"
   }
  ],
  "wc": {
   "points": [
    [
     -19.722,
     -14.575
    ],
    [
     -18.461,
     -14.575
    ],
    [
     -18.461,
     -16.477
    ],
    [
     -16.654,
     -16.477
    ],
    [
     -16.654,
     -17.312
    ],
    [
     -21.571,
     -17.312
    ],
    [
     -21.571,
     -16.477
    ],
    [
     -19.722,
     -16.477
    ]
   ],
   "opening": [
    [
     -19.722,
     -14.575
    ],
    [
     -18.461,
     -14.575
    ]
   ],
   "sideWalls": [
    [
     [
      -19.722,
      -14.575
     ],
     [
      -19.722,
      -16.477
     ]
    ],
    [
     [
      -18.461,
      -14.575
     ],
     [
      -18.461,
      -16.477
     ]
    ]
   ],
   "baffle": [
    [
     -20.415,
     -17.542
    ],
    [
     -17.789,
     -17.542
    ]
   ]
  },
  "furniture": [
   {
    "type": "round tables and separate four-legged mobile chairs",
    "centers": [
     [
      -28.494,
      -11.521
     ],
     [
      -28.494,
      -6.91
     ],
     [
      -12.892,
      -18.647
     ],
     [
      -9.096,
      -18.647
     ],
     [
      -12.681,
      -11.311
     ],
     [
      -9.096,
      -6.282
     ]
    ]
   },
   {
    "type": "curved/clustered general reading tables",
    "centers": [
     [
      -5.301,
      16.563
     ],
     [
      0.602,
      16.563
     ],
     [
      10.723,
      15.724
     ]
    ]
   }
  ]
 },
 "4F": {
  "source": "https://sub.lib.nccu.edu.tw/map/imgs/dhl4f.jpg",
  "regions": [
   [
    [
     -21.801,
     -14.436
    ],
    [
     19.603,
     -14.436
    ],
    [
     19.603,
     -0.801
    ],
    [
     14.638,
     -0.801
    ],
    [
     14.638,
     12.735
    ],
    [
     6.248,
     12.735
    ],
    [
     6.248,
     -8.166
    ],
    [
     -6.312,
     -8.166
    ],
    [
     -6.312,
     -8.614
    ],
    [
     -21.801,
     -8.614
    ]
   ],
   [
    [
     -40.915,
     -14.436
    ],
    [
     -32.525,
     -14.436
    ],
    [
     -32.525,
     -5.827
    ],
    [
     -34.61,
     -3.538
    ],
    [
     -40.915,
     -8.315
    ]
   ],
   [
    [
     -29.943,
     -14.436
    ],
    [
     -22.447,
     -14.436
    ],
    [
     -22.447,
     -1.746
    ],
    [
     -24.184,
     -1.746
    ],
    [
     -29.943,
     -6.225
    ]
   ],
   [
    [
     -7.652,
     13.481
    ],
    [
     12.652,
     13.481
    ],
    [
     12.652,
     19.701
    ],
    [
     -7.652,
     19.701
    ]
   ],
   [
    [
     -19.593,
     -14.638
    ],
    [
     -18.444,
     -14.638
    ],
    [
     -18.444,
     -16.439
    ],
    [
     -16.521,
     -16.439
    ],
    [
     -16.521,
     -17.298
    ],
    [
     -21.599,
     -17.298
    ],
    [
     -21.599,
     -16.439
    ],
    [
     -19.593,
     -16.439
    ]
   ],
   [
    [
     -19.593,
     -14.738
    ],
    [
     -18.444,
     -14.738
    ],
    [
     -18.444,
     -14.038
    ],
    [
     -19.593,
     -14.038
    ]
   ]
  ],
  "exclusions": [
   {
    "kind": "closedStairCore",
    "points": [
     [
      -29.943,
      -10.903
     ],
     [
      -24.035,
      -10.903
     ],
     [
      -24.035,
      -1.945
     ],
     [
      -29.943,
      -1.945
     ]
    ]
   }
  ],
  "fronts": [
   {
    "id": "north_rooms_south_front",
    "axis": "x",
    "fixed": -14.784,
    "lo": -15,
    "hi": 12.95,
    "face": 1,
    "doorCenters": [
     -11.773,
     4.113
    ]
   },
   {
    "id": "north_wc_south_front",
    "axis": "x",
    "fixed": -14.784,
    "lo": -22.05,
    "hi": -15,
    "face": 1,
    "doorCenters": []
   },
   {
    "id": "east_listening_west_front",
    "axis": "z",
    "fixed": 14.936,
    "lo": -0.502,
    "hi": 13.033,
    "face": -1,
    "doorCenters": [
     3.23,
     9.699
    ]
   },
   {
    "id": "east_listening_north",
    "axis": "x",
    "fixed": -0.502,
    "lo": 14.936,
    "hi": 20,
    "face": -1,
    "doorCenters": []
   }
  ],
  "diagonal": {
   "gameA": [
    -29.794,
    -1.746
   ],
   "gameB": [
    -18.376,
    6.863
   ],
   "gameDoorCenters": [
    [
     -28.355,
     -0.751
    ],
    [
     -25.674,
     1.488
    ],
    [
     -22.943,
     3.628
    ],
    [
     -20.411,
     5.519
    ]
   ],
   "publicFacing": "northeast"
  },
  "windows": {
   "axis": "x",
   "fixed": 20.05,
   "lo": -8,
   "hi": 12.752,
   "sourceDerivativePixels": [
    [
     686,
     918
    ],
    [
     1104,
     918
    ]
   ],
   "outwardFace": 1,
   "kind": "source exterior window-wall run interrupted by columns/piers; exact sill/head/mullion rhythm unknown",
   "notGuard": true,
   "uncertainty": "line location manual +/-3 derivative px; no full-height glazing guarantee; no source proof every bay opens"
  },
  "outerEdges": [
   {
    "id": "west_listening_outer_wall",
    "points": [
     [
      -41.312,
      -14.685
     ],
     [
      -41.312,
      -7.967
     ]
    ],
    "kind": "west-facing external enclosure of open AV wing, window/wall mix not determined"
   },
   {
    "id": "west_listening_diagonal_return",
    "points": [
     [
      -41.312,
      -7.967
     ],
     [
      -34.759,
      -2.99
     ]
    ],
    "kind": "SW-facing exterior diagonal return of AV wing; not an atrium guard"
   },
   {
    "id": "east_open_AV_exterior",
    "points": [
     [
      20.546,
      -14.486
     ],
     [
      20.546,
      -0.801
     ]
    ],
    "kind": "east-facing public AV outer wall with window openings; solid piers between windows supported by official photo, exact bay mapping unknown"
   }
  ],
  "wc": {
   "points": [
    [
     -19.593,
     -14.638
    ],
    [
     -18.444,
     -14.638
    ],
    [
     -18.444,
     -16.439
    ],
    [
     -16.521,
     -16.439
    ],
    [
     -16.521,
     -17.298
    ],
    [
     -21.599,
     -17.298
    ],
    [
     -21.599,
     -16.439
    ],
    [
     -19.593,
     -16.439
    ]
   ],
   "opening": [
    [
     -19.593,
     -14.638
    ],
    [
     -18.444,
     -14.638
    ]
   ],
   "sideWalls": [
    [
     [
      -19.593,
      -14.638
     ],
     [
      -19.593,
      -16.439
     ]
    ],
    [
     [
      -18.444,
      -14.638
     ],
     [
      -18.444,
      -16.439
     ]
    ]
   ],
   "baffle": [
    [
     -20.324,
     -17.57
    ],
    [
     -17.399,
     -17.57
    ]
   ]
  },
  "furniture": [
   {
    "type": "rectangular reading tables with separate chairs",
    "centers": [
     [
      -5.567,
      16.467
     ],
     [
      -2.589,
      16.467
     ],
     [
      0.887,
      16.467
     ],
     [
      4.362,
      16.467
     ],
     [
      8.582,
      16.467
     ],
     [
      -5.567,
      18.656
     ],
     [
      0.887,
      18.656
     ],
     [
      8.582,
      18.656
     ]
    ]
   },
   {
    "type": "pair/cluster AV workstations with dividing panels and task chairs",
    "centers": [
     [
      8.333,
      -3.986
     ],
     [
      11.312,
      -3.986
     ],
     [
      8.333,
      2.483
     ],
     [
      11.312,
      8.704
     ]
    ]
   }
  ],
  "counterServiceCorrection": {
   "sourceNativeCrops": [
    [
     1180,
     450,
     1760,
     900
    ],
    [
     1230,
     500,
     1740,
     850
    ],
    [
     1200,
     750,
     1800,
     930
    ]
   ],
   "status": "Confirmed rectangular floor-hole proposal was incorrect. Retract original4F12 hole; preserve solid floor.",
   "counterBody": {
    "sourceNativePixels": [
     [
      1395,
      758
     ],
     [
      1412,
      737
     ],
     [
      1440,
      702
     ],
     [
      1480,
      674
     ],
     [
      1520,
      659
     ],
     [
      1575,
      672
     ],
     [
      1600,
      679
     ],
     [
      1604,
      650
     ],
     [
      1590,
      638
     ],
     [
      1535,
      631
     ],
     [
      1495,
      636
     ],
     [
      1453,
      658
     ],
     [
      1410,
      710
     ],
     [
      1390,
      745
     ]
    ],
    "gameXZ": [
     [
      -12.906,
      -9.758
     ],
     [
      -12.551,
      -10.198
     ],
     [
      -11.966,
      -10.931
     ],
     [
      -11.13,
      -11.518
     ],
     [
      -10.294,
      -11.832
     ],
     [
      -9.145,
      -11.559
     ],
     [
      -8.622,
      -11.413
     ],
     [
      -8.539,
      -12.02
     ],
     [
      -8.831,
      -12.271
     ],
     [
      -9.981,
      -12.418
     ],
     [
      -10.817,
      -12.313
     ],
     [
      -11.694,
      -11.853
     ],
     [
      -12.593,
      -10.764
     ],
     [
      -13.011,
      -10.031
     ]
    ]
   },
   "staffWorkSideCandidate": {
    "sourceNativePixels": [
     [
      1460,
      690
     ],
     [
      1600,
      680
     ],
     [
      1680,
      680
     ],
     [
      1680,
      818
     ],
     [
      1410,
      818
     ],
     [
      1410,
      780
     ]
    ],
    "gameXZ": [
     [
      -11.548,
      -11.183
     ],
     [
      -8.622,
      -11.392
     ],
     [
      -6.951,
      -11.392
     ],
     [
      -6.951,
      -8.502
     ],
     [
      -12.593,
      -8.502
     ],
     [
      -12.593,
      -9.298
     ]
    ],
    "classification": "inference from task chairs on south/east inner side of curved counter; not a measured closed room, do not cut slab or infer access permission"
   },
   "publicFloorCandidates": {
    "north_front": {
     "sourceNativePixels": [
      [
       1304,
       532
      ],
      [
       1700,
       532
      ],
      [
       1700,
       628
      ],
      [
       1490,
       628
      ],
      [
       1430,
       650
      ],
      [
       1304,
       650
      ]
     ],
     "gameXZ": [
      [
       -14.808,
       -14.491
      ],
      [
       -6.533,
       -14.491
      ],
      [
       -6.533,
       -12.481
      ],
      [
       -10.921,
       -12.481
      ],
      [
       -12.175,
       -12.02
      ],
      [
       -14.808,
       -12.02
      ]
     ]
    },
    "west_front_and_atrium_link": {
     "sourceNativePixels": [
      [
       1304,
       650
      ],
      [
       1384,
       650
      ],
      [
       1384,
       858
      ],
      [
       1324,
       858
      ],
      [
       1324,
       820
      ],
      [
       1304,
       820
      ]
     ],
     "gameXZ": [
      [
       -14.808,
       -12.02
      ],
      [
       -13.136,
       -12.02
      ],
      [
       -13.136,
       -7.664
      ],
      [
       -14.39,
       -7.664
      ],
      [
       -14.39,
       -8.46
      ],
      [
       -14.808,
       -8.46
      ]
     ]
    }
   },
   "shelfPartitionLines": [
    {
     "id": "south_shelving",
     "sourceNativePixels": [
      [
       1395,
       826
      ],
      [
       1695,
       826
      ]
     ],
     "gameXZ": [
      [
       -12.906,
       -8.334
      ],
      [
       -6.637,
       -8.334
      ]
     ],
     "note": "closed shelf/low partition footprint; not opaque full-height wall or room-use proof"
    },
    {
     "id": "east_return_shelving",
     "sourceNativePixels": [
      [
       1708,
       670
      ],
      [
       1708,
       824
      ]
     ],
     "gameXZ": [
      [
       -6.366,
       -11.601
      ],
      [
       -6.366,
       -8.376
      ]
     ],
     "note": "vertical return of shelf/partition; contains counter equipment alongside; exact height unknown"
    }
   ],
   "openings": [
    {
     "id": "west_public_atrium_connection",
     "sourceNativePixels": [
      [
       1322,
       862
      ],
      [
       1389,
       862
      ]
     ],
     "gameXZ": [
      [
       -14.432,
       -7.58
      ],
      [
       -13.032,
       -7.58
      ]
     ],
     "note": "double-leaf door symbols visible; public west side connects atrium into open4F05 west of counter; leaf/open state unknown, game can present as opened threshold",
     "kind": "actual plan door gap; exact clear width/frame not measured"
    },
    {
     "id": "service_south_gap",
     "sourceNativePixels": [
      [
       1404,
       826
      ],
      [
       1462,
       826
      ]
     ],
     "gameXZ": [
      [
       -12.718,
       -8.334
      ],
      [
       -11.506,
       -8.334
      ]
     ],
     "note": "separate double-leaf opening in southern shelf/partition; leads behind counter/work side, public permission unresolved; do not use as required public through-route",
     "kind": "actual plan door gap; exact clear width/frame not measured"
    }
   ],
   "route": {
    "sourceNativeCenters": [
     [
      1350,
      895
     ],
     [
      1350,
      862
     ],
     [
      1350,
      790
     ],
     [
      1350,
      630
     ],
     [
      1400,
      580
     ],
     [
      1700,
      580
     ]
    ],
    "gameXZ": [
     [
      -13.847,
      -6.889
     ],
     [
      -13.847,
      -7.58
     ],
     [
      -13.847,
      -9.088
     ],
     [
      -13.847,
      -12.439
     ],
     [
      -12.802,
      -13.486
     ],
     [
      -6.533,
      -13.486
     ]
    ],
    "meaning": "atrium north band ->west public doorway ->west of counter ->north public face ->open north/east AV; line is source-topology route proposal only, final column/door-radius checks needed. x≈-13.8 can be legitimate at west doorway; do not preserve old test unless actual current aperture aligns."
   },
   "uncertainty": "manual native coordinate +/-8px; counter exact silhouette/height, partition height and door open state unknown; no browser/collision test performed; do not turn symbolic fixture lines into full room walls"
  }
 },
 "5F": {
  "source": "https://sub.lib.nccu.edu.tw/map/imgs/dhl5f.jpg",
  "regions": [
   [
    [
     9.564,
     -12.057
    ],
    [
     11.067,
     -12.057
    ],
    [
     11.067,
     -7.557
    ],
    [
     19.785,
     -7.557
    ],
    [
     19.785,
     12.586
    ],
    [
     9.564,
     12.586
    ]
   ],
   [
    [
     -7.614,
     13.571
    ],
    [
     12.785,
     13.571
    ],
    [
     12.785,
     19.7
    ],
    [
     -7.614,
     19.7
    ]
   ],
   [
    [
     -29.988,
     -14.629
    ],
    [
     -22.387,
     -14.629
    ],
    [
     -22.387,
     -7.943
    ],
    [
     -22.387,
     -1.3
    ],
    [
     -29.988,
     -1.3
    ]
   ],
   [
    [
     -19.537,
     -12.964
    ],
    [
     -18.3,
     -12.964
    ],
    [
     -18.3,
     -14.847
    ],
    [
     -16.538,
     -14.847
    ],
    [
     -16.538,
     -15.579
    ],
    [
     -21.488,
     -15.579
    ],
    [
     -21.488,
     -14.847
    ],
    [
     -19.537,
     -14.847
    ]
   ],
   [
    [
     -19.537,
     -13.064
    ],
    [
     -18.3,
     -13.064
    ],
    [
     -18.3,
     -12.364
    ],
    [
     -19.537,
     -12.364
    ]
   ]
  ],
  "exclusions": [
   {
    "kind": "closedStairCore",
    "points": [
     [
      -29.859,
      -10.343
     ],
     [
      -24.151,
      -10.343
     ],
     [
      -24.151,
      -3.314
     ],
     [
      -29.859,
      -3.314
     ]
    ]
   }
  ],
  "fronts": [
   {
    "id": "north_rooms_south_front",
    "axis": "x",
    "fixed": -13.214,
    "lo": -15,
    "hi": 6.086,
    "face": 1,
    "doorCenters": [
     -12.037,
     -4.693,
     2.135
    ]
   },
   {
    "id": "north_office_south_front",
    "axis": "x",
    "fixed": -14.929,
    "lo": 6.086,
    "hi": 13,
    "face": 1,
    "doorCenters": [
     8.104
    ]
   },
   {
    "id": "north_step_return",
    "axis": "z",
    "fixed": 6.086,
    "lo": -14.929,
    "hi": -13.214,
    "face": 1,
    "doorCenters": []
   },
   {
    "id": "north_wc_south_front",
    "axis": "x",
    "fixed": -12.914,
    "lo": -21.957,
    "hi": -15.344,
    "face": 1,
    "doorCenters": []
   },
   {
    "id": "print_south_front",
    "axis": "x",
    "fixed": -8.029,
    "lo": -21.957,
    "hi": -15,
    "face": 1,
    "doorCenters": []
   },
   {
    "id": "print_east_front",
    "axis": "z",
    "fixed": -15,
    "lo": -11.072,
    "hi": -8.029,
    "face": 1,
    "doorCenters": [
     -10.043
    ]
   },
   {
    "id": "maker_print_south_front",
    "axis": "x",
    "fixed": -7.857,
    "lo": 11.368,
    "hi": 20.172,
    "face": 1,
    "doorCenters": [
     14.804
    ]
   },
   {
    "id": "maker_print_west_return",
    "axis": "z",
    "fixed": 11.368,
    "lo": -12.229,
    "hi": -7.857,
    "face": -1,
    "doorCenters": []
   }
  ],
  "diagonal": {
   "gameA": [
    -28.227,
    -1
   ],
   "gameB": [
    -8.429,
    18.886
   ],
   "gameDoorCenters": [
    [
     -26.123,
     0.757
    ],
    [
     -23.16,
     3.8
    ],
    [
     -20.368,
     6.543
    ],
    [
     -17.577,
     9.371
    ],
    [
     -14.828,
     12.157
    ],
    [
     -12.037,
     14.943
    ],
    [
     -9.288,
     17.728
    ]
   ],
   "publicFacing": "northeast"
  },
  "windows": {
   "axis": "x",
   "fixed": 19.957,
   "lo": -7.914,
   "hi": 12.785,
   "sourceDerivativePixels": [
    [
     571,
     1044
    ],
    [
     1053,
     1044
    ]
   ],
   "outwardFace": 1,
   "kind": "source exterior window-wall run interrupted by columns/piers; exact sill/head/mullion rhythm unknown",
   "notGuard": true,
   "uncertainty": "line location manual +/-3 derivative px; no full-height glazing guarantee; no source proof every bay opens"
  },
  "outerEdges": [
   {
    "id": "east_open_maker_exterior",
    "points": [
     [
      20.515,
      -7.557
     ],
     [
      20.515,
      12.671
     ]
    ],
    "kind": "east-facing exterior window-wall of open5F18 maker/group floor; confirmed line, exact opening rhythm unknown"
   }
  ],
  "wc": {
   "points": [
    [
     -19.537,
     -12.964
    ],
    [
     -18.3,
     -12.964
    ],
    [
     -18.3,
     -14.847
    ],
    [
     -16.538,
     -14.847
    ],
    [
     -16.538,
     -15.579
    ],
    [
     -21.488,
     -15.579
    ],
    [
     -21.488,
     -14.847
    ],
    [
     -19.537,
     -14.847
    ]
   ],
   "opening": [
    [
     -19.537,
     -12.964
    ],
    [
     -18.3,
     -12.964
    ]
   ],
   "sideWalls": [
    [
     [
      -19.537,
      -12.964
     ],
     [
      -19.537,
      -14.847
     ]
    ],
    [
     [
      -18.3,
      -12.964
     ],
     [
      -18.3,
      -14.847
     ]
    ]
   ],
   "baffle": [
    [
     -20.271,
     -15.893
    ],
    [
     -17.818,
     -15.893
    ]
   ]
  },
  "furniture": [
   {
    "type": "small low tables with lounge chairs/sofas",
    "centers": [
     [
      -5.38,
      16.357
     ],
     [
      0.202,
      16.357
     ],
     [
      7.503,
      16.357
     ]
    ]
   },
   {
    "type": "hexagonal/group work tables with separate chairs",
    "centers": [
     [
      16.092,
      -1.857
     ],
     [
      16.951,
      2
     ]
    ]
   }
  ]
 },
 "7F": {
  "source": "https://sub.lib.nccu.edu.tw/map/imgs/dhl7f.jpg",
  "regions": [
   [
    [
     -31.494,
     -7.535
    ],
    [
     -22.7,
     -7.535
    ],
    [
     -22.7,
     -0.739
    ],
    [
     -18.369,
     -0.739
    ],
    [
     -18.369,
     5.797
    ],
    [
     -15.263,
     5.797
    ],
    [
     -8.569,
     12.985
    ],
    [
     -8.569,
     19.041
    ],
    [
     -31.494,
     -1
    ]
   ],
   [
    [
     -21.781,
     -14.419
    ],
    [
     -15.306,
     -14.419
    ],
    [
     -15.306,
     -10.585
    ],
    [
     -21.781,
     -10.585
    ]
   ],
   [
    [
     -7.65,
     13.378
    ],
    [
     12.694,
     13.378
    ],
    [
     12.694,
     19.521
    ],
    [
     -7.65,
     19.521
    ]
   ],
   [
    [
     -19.64,
     -14.602
    ],
    [
     -18.402,
     -14.602
    ],
    [
     -18.402,
     -16.377
    ],
    [
     -16.64,
     -16.377
    ],
    [
     -16.64,
     -17.213
    ],
    [
     -21.591,
     -17.213
    ],
    [
     -21.591,
     -16.377
    ],
    [
     -19.64,
     -16.377
    ]
   ],
   [
    [
     -19.64,
     -14.702
    ],
    [
     -18.402,
     -14.702
    ],
    [
     -18.402,
     -14.002
    ],
    [
     -19.64,
     -14.002
    ]
   ],
   [
    [
     -24.697,
     -10.382
    ],
    [
     -20.332,
     -10.382
    ],
    [
     -20.332,
     -8.46
    ],
    [
     -24.466,
     -8.46
    ],
    [
     -24.466,
     -9.15
    ],
    [
     -24.697,
     -9.15
    ]
   ],
   [
    [
     -24.445,
     -9.15
    ],
    [
     -22.997,
     -9.15
    ],
    [
     -22.997,
     -7.479
    ],
    [
     -24.445,
     -7.479
    ]
   ]
  ],
  "exclusions": [],
  "fronts": [
   {
    "id": "north_meeting_south_front",
    "axis": "x",
    "fixed": -16.598,
    "lo": -15,
    "hi": 13.044,
    "face": 1,
    "doorCenters": [
     -13.994,
     -7.563,
     -0.563,
     6.262
    ]
   },
   {
    "id": "north_wc_south_front",
    "axis": "x",
    "fixed": -14.724,
    "lo": -22,
    "hi": -15.394,
    "face": 1,
    "doorCenters": []
   },
   {
    "id": "east_rooms_west_front",
    "axis": "z",
    "fixed": 15.187,
    "lo": -14.942,
    "hi": 12.942,
    "face": -1,
    "doorCenters": [
     -14.637,
     -7.884,
     -0.739,
     6.189
    ]
   },
   {
    "id": "west_hall_east_front",
    "axis": "z",
    "fixed": -22.306,
    "lo": -21.956,
    "hi": -10.367,
    "face": 1,
    "doorCenters": [
     -13.766
    ]
   },
   {
    "id": "west_hall_south_front",
    "sourceNativePixels": [
     [
      90,
      742
     ],
     [
      477,
      742
     ]
    ],
    "gameXZ": [
     [
      -30.655,
      -10.466
     ],
     [
      -22.536,
      -10.466
     ]
    ],
    "classification": "solid south conference-hall boundary also north side of G-stair enclosure; height/material unknown",
    "axis": "x",
    "fixed": -10.466,
    "lo": -30.655,
    "hi": -22.536,
    "face": 1,
    "doorCenters": []
   },
   {
    "id": "west_hall_south_closed_door",
    "sourceNativePixels": [
     [
      20,
      742
     ],
     [
      90,
      742
     ]
    ],
    "gameXZ": [
     [
      -32.124,
      -10.466
     ],
     [
      -30.655,
      -10.466
     ]
    ],
    "kind": "double-leaf doorway at west end of southern hall boundary",
    "face": 1,
    "permission": "unverified booking/access state",
    "axis": "x",
    "fixed": -10.466,
    "lo": -32.124,
    "hi": -30.655,
    "doorCenters": [
     -31.3895
    ],
    "doorWidth": 1.4
   }
  ],
  "diagonal": {
   "gameA": [
    -18.019,
    7.975
   ],
   "gameB": [
    -8.088,
    17.952
   ],
   "gameDoorCenters": [
    [
     -16.794,
     9.239
    ],
    [
     -14.3,
     11.766
    ],
    [
     -11.806,
     14.336
    ],
    [
     -9.181,
     16.907
    ]
   ],
   "publicFacing": "northeast"
  },
  "windows": {
   "axis": "x",
   "fixed": 20,
   "lo": -8,
   "hi": 12.869,
   "sourceDerivativePixels": [
    [
     561,
     1052
    ],
    [
     1038,
     1052
    ]
   ],
   "outwardFace": 1,
   "kind": "source exterior window-wall run interrupted by columns/piers; exact sill/head/mullion rhythm unknown",
   "notGuard": true,
   "uncertainty": "line location manual +/-3 derivative px; no full-height glazing guarantee; no source proof every bay opens",
   "alignmentNote": "Aligned to registered row I z=20 and native south counter rear edge near2197; former19.869 was a conservative manual window trace. Glass/wall and slab move together; dimensions remain game estimates."
  },
  "outerEdges": [],
  "wc": {
   "points": [
    [
     -19.64,
     -14.602
    ],
    [
     -18.402,
     -14.602
    ],
    [
     -18.402,
     -16.377
    ],
    [
     -16.64,
     -16.377
    ],
    [
     -16.64,
     -17.213
    ],
    [
     -21.591,
     -17.213
    ],
    [
     -21.591,
     -16.377
    ],
    [
     -19.64,
     -16.377
    ]
   ],
   "opening": [
    [
     -19.64,
     -14.602
    ],
    [
     -18.402,
     -14.602
    ]
   ],
   "sideWalls": [
    [
     [
      -19.64,
      -14.602
     ],
     [
      -19.64,
      -16.377
     ]
    ],
    [
     [
      -18.402,
      -14.602
     ],
     [
      -18.402,
      -16.377
     ]
    ]
   ],
   "baffle": [
    [
     -20.374,
     -17.463
    ],
    [
     -17.92,
     -17.463
    ]
   ]
  },
  "furniture": [
   {
    "type": "lounge sofa groups with low side tables",
    "centers": [
     [
      -1.919,
      15.861
     ],
     [
      7.706,
      15.861
     ]
    ]
   },
   {
    "type": "west exchange seats and group tables",
    "centers": [
     [
      -28.606,
      -4.616
     ],
     [
      -28.606,
      -0.259
     ],
     [
      -18.981,
      -11.805
     ]
    ]
   }
  ],
  "ghCorridorRegistration": {
   "sourceNativeCrop": [
    20,
    650,
    870,
    950
   ],
   "publicCorridor": {
    "sourceNativePixels": [
     [
      374,
      746
     ],
     [
      582,
      746
     ],
     [
      582,
      838
     ],
     [
      385,
      838
     ],
     [
      385,
      805
     ],
     [
      374,
      805
     ]
    ],
    "gameXZ": [
     [
      -24.697,
      -10.382
     ],
     [
      -20.332,
      -10.382
     ],
     [
      -20.332,
      -8.46
     ],
     [
      -24.466,
      -8.46
     ],
     [
      -24.466,
      -9.15
     ],
     [
      -24.697,
      -9.15
     ]
    ],
    "classification": "source-confirmed7F02 floor, conservative boundary; preserve G/H treads and core column, no broad hole"
   },
   "exchangeConnector": {
    "sourceNativePixels": [
     [
      386,
      805
     ],
     [
      455,
      805
     ],
     [
      455,
      885
     ],
     [
      386,
      885
     ]
    ],
    "gameXZ": [
     [
      -24.445,
      -9.15
     ],
     [
      -22.997,
      -9.15
     ],
     [
      -22.997,
      -7.479
     ],
     [
      -24.445,
      -7.479
     ]
    ],
    "classification": "open floor east of G shaft and west of beam-column; player clearance untested"
   },
   "southOpenPassageIntoExchange": {
    "sourceNativePixels": [
     [
      386,
      838
     ],
     [
      455,
      838
     ]
    ],
    "gameXZ": [
     [
      -24.445,
      -8.46
     ],
     [
      -22.997,
      -8.46
     ]
    ],
    "kind": "openPassage",
    "doorLeaf": false
   },
   "hall7F04SouthWall": {
    "sourceNativePixels": [
     [
      90,
      742
     ],
     [
      477,
      742
     ]
    ],
    "gameXZ": [
     [
      -30.655,
      -10.466
     ],
     [
      -22.536,
      -10.466
     ]
    ],
    "classification": "solid south conference-hall boundary also north side of G-stair enclosure; height/material unknown",
    "axis": "x",
    "fixed": -10.466,
    "lo": -30.655,
    "hi": -22.536,
    "face": 1
   },
   "hall7F04WestSouthDoor": {
    "sourceNativePixels": [
     [
      20,
      742
     ],
     [
      90,
      742
     ]
    ],
    "gameXZ": [
     [
      -32.124,
      -10.466
     ],
     [
      -30.655,
      -10.466
     ]
    ],
    "kind": "double-leaf doorway at west end of southern hall boundary",
    "face": 1,
    "permission": "unverified booking/access state",
    "axis": "x",
    "fixed": -10.466,
    "lo": -32.124,
    "hi": -30.655
   },
   "sourceTopologyRoute": {
    "sourceNativePixels": [
     [
      380,
      778
     ],
     [
      430,
      778
     ],
     [
      500,
      778
     ],
     [
      550,
      778
     ],
     [
      550,
      815
     ],
     [
      585,
      815
     ]
    ],
    "gameXZ": [
     [
      -24.571,
      -9.714
     ],
     [
      -23.522,
      -9.714
     ],
     [
      -22.053,
      -9.714
     ],
     [
      -21.004,
      -9.714
     ],
     [
      -21.004,
      -8.941
     ],
     [
      -20.27,
      -8.941
     ]
    ],
    "meaning": "G eastDN ->east across7F02 ->south west of H ->H westUP; not runtime tested"
   },
   "exclusions": {
    "G": "retain actual horizontal treads and lower void, do not flatfill nativex115..374,y750..840",
    "H": "retain actual H treads, connector ends at west threshold",
    "coreColumn": "native approximatelyx460..500,y830..870; hatched beam extends east at y835; do not route south across beam",
    "hall": "north ofy742 remains7F04 conference room apart from source west door"
   },
   "uncertainty": "manual native +/-8px; final widths, door open state and finished faces unknown. Coherent union/landing join required to remove artificial inset seams; no product/GPU test.",
   "GVerticalRelation": "5F/7F direct connection and6F involvement unknown; no6F floor/stop inferred"
  }
 }
};

// 已授權合理重建：保留來源描點，遊戲前廊採同源的較寬輪廓。
for(const rear of Object.values(SOURCE_REAR_LAYOUT))widenPublicWc(rear);

// G梯上端前廊與會議廳共用邊界，向封閉室內退讓，保留正常落腳及鏡頭空間。
for(const front of SOURCE_REAR_LAYOUT['7F'].fronts){
 if(front.id.startsWith('west_hall_south_')){
  front.sourceFixed=front.fixed;front.fixed-=.75;front.clearanceOffset=-.75;
  if(front.gameXZ)front.gameXZ=front.gameXZ.map(([x])=>[x,front.fixed]);
 }
 if(front.id==='west_hall_east_front')front.hi-=.75;
}

// 書牆正背兩面均保留正常鏡頭，向未開放房間內退讓前牆。
// 來源描點留作比對，門的位置沿牆保留，房間輪廓由同一遊戲邊界重建。
for(const [id,frontId,offset] of [
 ['5F','north_rooms_south_front',-2.15],
 ['5F','north_office_south_front',-.435],
 ['7F','north_meeting_south_front',-2.15],
 ['7F','east_rooms_west_front',1.7],
]){
 const front=SOURCE_REAR_LAYOUT[id].fronts.find(f=>f.id===frontId);
 front.sourceFixed=front.fixed;front.fixed+=offset;front.clearanceOffset=offset;
 if(front.gameXZ)front.gameXZ=front.gameXZ.map(([x,z])=>front.axis==='x'?[x,front.fixed]:[front.fixed,z]);
}
// 兩段北側門面現在共線，不保留原本短回牆在新走道內形成凸角。
const northReturn=SOURCE_REAR_LAYOUT['5F'].fronts.findIndex(f=>f.id==='north_step_return');
if(northReturn>=0)SOURCE_REAR_LAYOUT['5F'].fronts.splice(northReturn,1);
