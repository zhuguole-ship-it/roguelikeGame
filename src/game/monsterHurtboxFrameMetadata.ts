// Generated offline from project-local PNG alpha pixels on 2026-07-31.
// Runtime consumers only read these static measurements; they never scan image alpha.

export type MonsterFrameBodyBounds = {
  source: string
  sourceSize: readonly [number, number]
  /** Full non-transparent source-pixel bounds, retained for offline verification. */
  alpha: readonly [number, number, number, number]
  /** Body-only source-pixel envelope; bows, swords, shadows and effects are trimmed. */
  body: readonly [number, number, number, number]
}

export type MonsterFrameBodyMetadataKind = 'skeleton-warrior' | 'skeleton-archer' | 'hellhound' | 'corrosive-slime' | 'jailer-chief' | 'dungeon-warden'

export type MonsterStableBodyCore = {
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * Precomputed from every non-death corrosive-slime frame in the table below.
 * These are the 10th/90th percentile weapon/effect-excluded body bounds,
 * normalized around the renderer's ground root. They remain frame-invariant
 * so melee pursuit does not wobble with a lobe or attack pose.
 */
export const MONSTER_STABLE_BODY_CORES: Partial<Record<MonsterFrameBodyMetadataKind, MonsterStableBodyCore>> = {
  'corrosive-slime': {
    left: -47 / 192,
    top: -82 / 192,
    right: 47 / 192,
    bottom: 0,
  },
}

export const MONSTER_FRAME_BODY_METADATA: Record<MonsterFrameBodyMetadataKind, Record<string, readonly MonsterFrameBodyBounds[]>> = {
  "skeleton-warrior": {
    "idle": [
      {
        "source": "assets/monsters/skeleton-warrior-pt/Hurt/Hurt-1.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          45,
          30,
          146,
          162
        ],
        "body": [
          70,
          33,
          126,
          161
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Hurt/Hurt-2.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          44,
          32,
          145,
          162
        ],
        "body": [
          69,
          35,
          126,
          161
        ]
      }
    ],
    "move": [
      {
        "source": "assets/monsters/skeleton-warrior-pt/Run/Run-1.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          33,
          33,
          159,
          162
        ],
        "body": [
          49,
          36,
          127,
          160
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Run/Run-2.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          33,
          34,
          155,
          162
        ],
        "body": [
          50,
          38,
          129,
          160
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Run/Run-3.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          12,
          30,
          153,
          149
        ],
        "body": [
          52,
          33,
          130,
          144
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Run/Run-4.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          21,
          36,
          153,
          162
        ],
        "body": [
          56,
          40,
          133,
          159
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Run/Run-5.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          39,
          33,
          153,
          162
        ],
        "body": [
          56,
          36,
          129,
          160
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Run/Run-6.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          36,
          36,
          155,
          162
        ],
        "body": [
          54,
          39,
          130,
          159
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Run/Run-7.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          25,
          36,
          161,
          162
        ],
        "body": [
          49,
          39,
          128,
          160
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Run/Run-8.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          30,
          35,
          165,
          162
        ],
        "body": [
          46,
          38,
          123,
          160
        ]
      }
    ],
    "attack": [
      {
        "source": "assets/monsters/skeleton-warrior-pt/Attack/Attack-1.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          30,
          71,
          125,
          177
        ],
        "body": [
          58,
          74,
          111,
          176
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Attack/Attack-2.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          30,
          57,
          133,
          177
        ],
        "body": [
          54,
          60,
          104,
          176
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Attack/Attack-3.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          30,
          57,
          127,
          177
        ],
        "body": [
          53,
          60,
          103,
          176
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Attack/Attack-4.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          16,
          21,
          192,
          177
        ],
        "body": [
          40,
          24,
          145,
          176
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Attack/Attack-5.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          6,
          6,
          107,
          177
        ],
        "body": [
          25,
          12,
          88,
          176
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Attack/Attack-6.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          0,
          6,
          106,
          177
        ],
        "body": [
          19,
          12,
          88,
          176
        ]
      }
    ],
    "hit": [
      {
        "source": "assets/monsters/skeleton-warrior-pt/Hurt/Hurt-1.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          45,
          30,
          146,
          162
        ],
        "body": [
          70,
          33,
          126,
          161
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Hurt/Hurt-2.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          44,
          32,
          145,
          162
        ],
        "body": [
          69,
          35,
          126,
          161
        ]
      }
    ],
    "death": [
      {
        "source": "assets/monsters/skeleton-warrior-pt/Dead/Dead-1.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          84,
          33,
          173,
          165
        ],
        "body": [
          97,
          36,
          152,
          164
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Dead/Dead-2.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          84,
          39,
          173,
          165
        ],
        "body": [
          95,
          42,
          152,
          165
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Dead/Dead-3.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          57,
          81,
          173,
          165
        ],
        "body": [
          72,
          83,
          153,
          165
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Dead/Dead-4.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          28,
          126,
          175,
          165
        ],
        "body": [
          40,
          128,
          154,
          165
        ]
      }
    ],
    "skill": [
      {
        "source": "assets/monsters/skeleton-warrior-pt/Protect/Protect-1.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          57,
          30,
          135,
          162
        ],
        "body": [
          74,
          33,
          126,
          161
        ]
      }
    ],
    "skill2": [
      {
        "source": "assets/monsters/skeleton-warrior-pt/Run+attack/Run+attack-1.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          30,
          22,
          115,
          171
        ],
        "body": [
          50,
          27,
          102,
          168
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Run+attack/Run+attack-2.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          24,
          27,
          117,
          171
        ],
        "body": [
          40,
          31,
          96,
          167
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Run+attack/Run+attack-3.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          24,
          21,
          117,
          171
        ],
        "body": [
          50,
          25,
          97,
          168
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Run+attack/Run+attack-4.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          0,
          49,
          116,
          171
        ],
        "body": [
          53,
          52,
          101,
          169
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Run+attack/Run+attack-5.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          15,
          45,
          191,
          171
        ],
        "body": [
          47,
          49,
          147,
          169
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Run+attack/Run+attack-6.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          15,
          45,
          177,
          171
        ],
        "body": [
          45,
          48,
          102,
          170
        ]
      },
      {
        "source": "assets/monsters/skeleton-warrior-pt/Run+attack/Run+attack-7.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          15,
          45,
          103,
          171
        ],
        "body": [
          39,
          48,
          85,
          170
        ]
      }
    ]
  },
  "skeleton-archer": {
    "idle": [
      {
        "source": "assets/monsters/skeleton-archer-image2/Idle/Idle-1@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          54,
          21,
          141,
          171
        ],
        "body": [
          67,
          24,
          114,
          170
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Idle/Idle-2@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          54,
          21,
          141,
          171
        ],
        "body": [
          67,
          24,
          114,
          170
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Idle/Idle-3@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          54,
          21,
          141,
          171
        ],
        "body": [
          67,
          24,
          114,
          170
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Idle/Idle-4@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          54,
          21,
          141,
          171
        ],
        "body": [
          66,
          24,
          114,
          170
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Idle/Idle-5@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          54,
          21,
          141,
          171
        ],
        "body": [
          67,
          24,
          114,
          170
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Idle/Idle-6@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          54,
          21,
          141,
          171
        ],
        "body": [
          67,
          24,
          114,
          170
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Idle/Idle-7@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          54,
          21,
          141,
          171
        ],
        "body": [
          67,
          24,
          113,
          170
        ]
      }
    ],
    "move": [
      {
        "source": "assets/monsters/skeleton-archer-image2/Move/Walk-1@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          54,
          18,
          138,
          174
        ],
        "body": [
          81,
          20,
          115,
          172
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Move/Walk-2@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          57,
          18,
          141,
          174
        ],
        "body": [
          76,
          20,
          118,
          172
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Move/Walk-3@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          57,
          18,
          141,
          174
        ],
        "body": [
          74,
          20,
          120,
          172
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Move/Walk-4@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          54,
          18,
          138,
          174
        ],
        "body": [
          74,
          20,
          113,
          172
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Move/Walk-5@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          54,
          18,
          138,
          174
        ],
        "body": [
          77,
          20,
          113,
          172
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Move/Walk-6@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          54,
          18,
          138,
          174
        ],
        "body": [
          76,
          20,
          119,
          172
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Move/Walk-7@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          51,
          18,
          135,
          174
        ],
        "body": [
          77,
          20,
          118,
          172
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Move/Walk-8@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          54,
          18,
          140,
          174
        ],
        "body": [
          80,
          20,
          117,
          172
        ]
      }
    ],
    "attack": [
      {
        "source": "assets/monsters/skeleton-archer-image2/Attack/Shot-1@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          30,
          23,
          120,
          174
        ],
        "body": [
          51,
          27,
          102,
          173
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Attack/Shot-2@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          33,
          21,
          137,
          174
        ],
        "body": [
          52,
          25,
          117,
          172
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Attack/Shot-3@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          33,
          6,
          141,
          174
        ],
        "body": [
          52,
          13,
          122,
          172
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Attack/Shot-4@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          27,
          6,
          143,
          174
        ],
        "body": [
          51,
          13,
          122,
          172
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Attack/Shot-5@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          15,
          6,
          141,
          174
        ],
        "body": [
          50,
          14,
          121,
          172
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Attack/Shot-6@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          3,
          6,
          141,
          174
        ],
        "body": [
          50,
          14,
          121,
          172
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Attack/Shot-7@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          24,
          6,
          141,
          174
        ],
        "body": [
          49,
          14,
          121,
          172
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Attack/Shot-8@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          45,
          6,
          153,
          174
        ],
        "body": [
          56,
          13,
          125,
          172
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Attack/Shot-9@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          48,
          6,
          180,
          174
        ],
        "body": [
          57,
          13,
          128,
          172
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Attack/Shot-10@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          48,
          6,
          180,
          174
        ],
        "body": [
          57,
          13,
          128,
          172
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Attack/Shot-11@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          48,
          6,
          159,
          174
        ],
        "body": [
          58,
          13,
          126,
          172
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Attack/Shot-12@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          24,
          10,
          147,
          174
        ],
        "body": [
          53,
          15,
          121,
          172
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Attack/Shot-13@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          24,
          6,
          141,
          174
        ],
        "body": [
          54,
          13,
          122,
          172
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Attack/Shot-14@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          24,
          6,
          141,
          174
        ],
        "body": [
          54,
          13,
          122,
          172
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Attack/Shot-15@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          25,
          6,
          142,
          174
        ],
        "body": [
          55,
          13,
          123,
          172
        ]
      }
    ],
    "hit": [
      {
        "source": "assets/monsters/skeleton-archer-image2/Hit/Hurt-1@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          45,
          21,
          149,
          171
        ],
        "body": [
          62,
          24,
          118,
          170
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Hit/Hurt-2@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          45,
          21,
          145,
          171
        ],
        "body": [
          59,
          24,
          116,
          170
        ]
      }
    ],
    "death": [
      {
        "source": "assets/monsters/skeleton-archer-image2/Death/Dead-1@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          9,
          21,
          108,
          171
        ],
        "body": [
          18,
          24,
          93,
          170
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Death/Dead-2@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          9,
          30,
          98,
          171
        ],
        "body": [
          19,
          32,
          84,
          170
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Death/Dead-3@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          3,
          45,
          120,
          171
        ],
        "body": [
          30,
          47,
          80,
          171
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Death/Dead-4@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          0,
          66,
          126,
          171
        ],
        "body": [
          40,
          68,
          118,
          171
        ]
      },
      {
        "source": "assets/monsters/skeleton-archer-image2/Death/Dead-5@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          13,
          145,
          187,
          171
        ],
        "body": [
          39,
          147,
          178,
          171
        ]
      }
    ]
  },
  "hellhound": {
    "idle": [
      {
        "source": "assets/monsters/hellhound-image2/Idle/Idle-1@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          17,
          50,
          182,
          147
        ],
        "body": [
          22,
          58,
          174,
          146
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Idle/Idle-2@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          17,
          50,
          182,
          147
        ],
        "body": [
          22,
          58,
          174,
          146
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Idle/Idle-3@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          17,
          49,
          185,
          147
        ],
        "body": [
          22,
          56,
          177,
          146
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Idle/Idle-4@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          13,
          48,
          186,
          147
        ],
        "body": [
          21,
          55,
          178,
          146
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Idle/Idle-5@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          18,
          49,
          186,
          147
        ],
        "body": [
          25,
          56,
          178,
          146
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Idle/Idle-6@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          23,
          52,
          186,
          147
        ],
        "body": [
          27,
          59,
          178,
          146
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Idle/Idle-7@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          15,
          50,
          189,
          147
        ],
        "body": [
          26,
          57,
          179,
          146
        ]
      }
    ],
    "move": [
      {
        "source": "assets/monsters/hellhound-image2/Move/Move-1@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          0,
          54,
          180,
          147
        ],
        "body": [
          6,
          62,
          170,
          144
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Move/Move-2@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          0,
          53,
          180,
          147
        ],
        "body": [
          5,
          60,
          171,
          143
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Move/Move-3@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          0,
          49,
          192,
          139
        ],
        "body": [
          5,
          56,
          184,
          133
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Move/Move-4@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          8,
          53,
          184,
          147
        ],
        "body": [
          16,
          60,
          175,
          142
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Move/Move-5@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          14,
          54,
          184,
          147
        ],
        "body": [
          19,
          62,
          174,
          144
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Move/Move-6@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          13,
          45,
          183,
          147
        ],
        "body": [
          18,
          51,
          174,
          142
        ]
      }
    ],
    "attack": [
      {
        "source": "assets/monsters/hellhound-image2/Attack/Attack-1@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          0,
          59,
          166,
          156
        ],
        "body": [
          4,
          67,
          156,
          155
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Attack/Attack-2@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          0,
          45,
          169,
          156
        ],
        "body": [
          6,
          53,
          162,
          155
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Attack/Attack-3@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          1,
          37,
          175,
          156
        ],
        "body": [
          7,
          46,
          165,
          155
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Attack/Attack-4@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          0,
          36,
          176,
          156
        ],
        "body": [
          8,
          44,
          165,
          155
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Attack/Attack-5@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          6,
          37,
          182,
          156
        ],
        "body": [
          10,
          46,
          168,
          155
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Attack/Attack-6@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          0,
          39,
          174,
          156
        ],
        "body": [
          7,
          47,
          165,
          155
        ]
      }
    ],
    "hit": [
      {
        "source": "assets/monsters/hellhound-image2/Hit/Hit-1@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          0,
          48,
          171,
          147
        ],
        "body": [
          5,
          55,
          161,
          146
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Hit/Hit-2@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          0,
          48,
          170,
          147
        ],
        "body": [
          4,
          55,
          161,
          146
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Hit/Hit-3@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          1,
          48,
          179,
          147
        ],
        "body": [
          9,
          55,
          169,
          146
        ]
      }
    ],
    "death": [
      {
        "source": "assets/monsters/hellhound-image2/Death/Death-1@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          0,
          48,
          171,
          147
        ],
        "body": [
          5,
          55,
          161,
          146
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Death/Death-2@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          0,
          52,
          176,
          147
        ],
        "body": [
          6,
          58,
          168,
          146
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Death/Death-3@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          0,
          62,
          179,
          147
        ],
        "body": [
          5,
          67,
          172,
          146
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Death/Death-4@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          0,
          87,
          180,
          147
        ],
        "body": [
          17,
          92,
          174,
          147
        ]
      },
      {
        "source": "assets/monsters/hellhound-image2/Death/Death-5@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          1,
          108,
          179,
          147
        ],
        "body": [
          17,
          110,
          174,
          147
        ]
      }
    ]
  },
  "corrosive-slime": {
    "idle": [
      {
        "source": "assets/monsters/corrupt-green-slime/Idle/Idle-1.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          69,
          66,
          123,
          135
        ],
        "body": [
          73,
          70,
          122,
          134
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Idle/Idle-2.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          66,
          63,
          123,
          135
        ],
        "body": [
          72,
          67,
          121,
          134
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Idle/Idle-3.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          63,
          60,
          126,
          135
        ],
        "body": [
          70,
          65,
          124,
          134
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Idle/Idle-4.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          69,
          60,
          123,
          135
        ],
        "body": [
          73,
          83,
          122,
          134
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Idle/Idle-5.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          72,
          75,
          123,
          135
        ],
        "body": [
          75,
          79,
          121,
          134
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Idle/Idle-6.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          69,
          72,
          123,
          135
        ],
        "body": [
          74,
          76,
          120,
          134
        ]
      }
    ],
    "move": [
      {
        "source": "assets/monsters/corrupt-green-slime/Move/Run-1.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          66,
          96,
          126,
          141
        ],
        "body": [
          70,
          97,
          119,
          140
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Move/Run-2.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          54,
          72,
          123,
          141
        ],
        "body": [
          63,
          75,
          120,
          140
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Move/Run-3.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          45,
          60,
          132,
          141
        ],
        "body": [
          62,
          66,
          130,
          140
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Move/Run-4.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          54,
          57,
          132,
          141
        ],
        "body": [
          73,
          62,
          131,
          140
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Move/Run-5.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          69,
          54,
          129,
          141
        ],
        "body": [
          72,
          59,
          126,
          141
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Move/Run-6.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          60,
          54,
          135,
          141
        ],
        "body": [
          65,
          98,
          131,
          141
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Move/Run-7.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          57,
          102,
          135,
          141
        ],
        "body": [
          60,
          105,
          131,
          141
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Move/Run-8.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          60,
          96,
          132,
          141
        ],
        "body": [
          63,
          98,
          125,
          140
        ]
      }
    ],
    "attack": [
      {
        "source": "assets/monsters/corrupt-green-slime/Attack/Attack-1.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          69,
          102,
          123,
          150
        ],
        "body": [
          71,
          104,
          120,
          149
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Attack/Attack-2.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          63,
          114,
          126,
          150
        ],
        "body": [
          65,
          115,
          124,
          150
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Attack/Attack-3.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          75,
          78,
          114,
          150
        ],
        "body": [
          76,
          81,
          113,
          148
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Attack/Attack-4.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          75,
          69,
          114,
          150
        ],
        "body": [
          76,
          72,
          112,
          148
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Attack/Attack-5.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          60,
          114,
          129,
          150
        ],
        "body": [
          64,
          116,
          125,
          150
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Attack/Attack-6.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          45,
          93,
          147,
          150
        ],
        "body": [
          49,
          97,
          143,
          149
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Attack/Attack-7.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          15,
          60,
          174,
          150
        ],
        "body": [
          24,
          66,
          165,
          148
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Attack/Attack-8.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          12,
          54,
          180,
          150
        ],
        "body": [
          20,
          59,
          172,
          149
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Attack/Attack-9.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          6,
          48,
          186,
          150
        ],
        "body": [
          14,
          53,
          178,
          149
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Attack/Attack-10.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          3,
          45,
          189,
          150
        ],
        "body": [
          69,
          74,
          120,
          149
        ]
      }
    ],
    "hit": [
      {
        "source": "assets/monsters/corrupt-green-slime/Hit/Hurt-1.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          72,
          75,
          123,
          126
        ],
        "body": [
          74,
          76,
          122,
          125
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Hit/Hurt-2.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          69,
          75,
          126,
          126
        ],
        "body": [
          71,
          79,
          123,
          125
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Hit/Hurt-3.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          66,
          69,
          129,
          126
        ],
        "body": [
          69,
          73,
          126,
          125
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Hit/Hurt-4.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          66,
          66,
          132,
          126
        ],
        "body": [
          69,
          71,
          128,
          125
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Hit/Hurt-5.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          60,
          66,
          132,
          126
        ],
        "body": [
          70,
          81,
          125,
          125
        ]
      }
    ],
    "death": [
      {
        "source": "assets/monsters/corrupt-green-slime/Death/Death-1.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          72,
          78,
          123,
          132
        ],
        "body": [
          74,
          81,
          122,
          131
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Death/Death-2.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          72,
          72,
          123,
          132
        ],
        "body": [
          75,
          73,
          122,
          131
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Death/Death-3.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          75,
          63,
          120,
          132
        ],
        "body": [
          78,
          67,
          119,
          131
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Death/Death-4.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          66,
          60,
          129,
          132
        ],
        "body": [
          70,
          65,
          125,
          132
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Death/Death-5.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          54,
          60,
          141,
          132
        ],
        "body": [
          60,
          93,
          135,
          132
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Death/Death-6.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          45,
          84,
          153,
          132
        ],
        "body": [
          50,
          88,
          148,
          132
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Death/Death-7.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          42,
          81,
          153,
          129
        ],
        "body": [
          46,
          85,
          144,
          129
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Death/Death-8.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          42,
          78,
          153,
          129
        ],
        "body": [
          45,
          83,
          141,
          129
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Death/Death-9.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          42,
          75,
          144,
          129
        ],
        "body": [
          45,
          100,
          141,
          129
        ]
      },
      {
        "source": "assets/monsters/corrupt-green-slime/Death/Death-10.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          42,
          108,
          144,
          129
        ],
        "body": [
          45,
          108,
          141,
          129
        ]
      }
    ]
  },
  "jailer-chief": {
    "idle": [
      {
        "source": "assets/monsters/dungeon-jailer-chief/Idle/Idle-1.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          27,
          21,
          166,
          171
        ],
        "body": [
          56,
          29,
          118,
          168
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Idle/Idle-2.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          27,
          21,
          167,
          171
        ],
        "body": [
          57,
          29,
          119,
          169
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Idle/Idle-3.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          25,
          21,
          166,
          171
        ],
        "body": [
          56,
          29,
          118,
          168
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Idle/Idle-4.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          22,
          21,
          166,
          171
        ],
        "body": [
          54,
          29,
          119,
          169
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Idle/Idle-5.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          27,
          21,
          165,
          171
        ],
        "body": [
          55,
          29,
          118,
          169
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Idle/Idle-6.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          22,
          21,
          168,
          171
        ],
        "body": [
          56,
          29,
          120,
          169
        ]
      }
    ],
    "move": [
      {
        "source": "assets/monsters/dungeon-jailer-chief/Run/Run-1.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          21,
          24,
          149,
          166
        ],
        "body": [
          48,
          32,
          123,
          158
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Run/Run-2.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          6,
          21,
          148,
          162
        ],
        "body": [
          37,
          29,
          123,
          154
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Run/Run-3.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          12,
          22,
          161,
          156
        ],
        "body": [
          44,
          30,
          131,
          153
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Run/Run-4.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          12,
          15,
          178,
          151
        ],
        "body": [
          44,
          23,
          134,
          146
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Run/Run-5.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          15,
          18,
          178,
          155
        ],
        "body": [
          46,
          25,
          132,
          149
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Run/Run-6.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          11,
          13,
          183,
          151
        ],
        "body": [
          44,
          21,
          132,
          145
        ]
      }
    ],
    "attack": [
      {
        "source": "assets/monsters/dungeon-jailer-chief/Attack/Attack-1.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          12,
          30,
          142,
          161
        ],
        "body": [
          42,
          38,
          122,
          157
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Attack/Attack-2.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          12,
          31,
          154,
          164
        ],
        "body": [
          42,
          39,
          128,
          158
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Attack/Attack-3.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          15,
          35,
          156,
          162
        ],
        "body": [
          46,
          43,
          128,
          157
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Attack/Attack-4.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          9,
          34,
          171,
          162
        ],
        "body": [
          40,
          40,
          126,
          158
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Attack/Attack-5.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          16,
          31,
          181,
          161
        ],
        "body": [
          44,
          34,
          153,
          157
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Attack/Attack-6.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          0,
          31,
          188,
          161
        ],
        "body": [
          27,
          38,
          111,
          157
        ]
      }
    ],
    "skill": [
      {
        "source": "assets/monsters/dungeon-jailer-chief/Skill/Skill-1.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          15,
          32,
          145,
          188
        ],
        "body": [
          38,
          42,
          123,
          184
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Skill/Skill-2.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          12,
          32,
          139,
          188
        ],
        "body": [
          36,
          42,
          117,
          185
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Skill/Skill-3.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          16,
          21,
          145,
          188
        ],
        "body": [
          38,
          34,
          125,
          186
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Skill/Skill-4.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          15,
          19,
          156,
          188
        ],
        "body": [
          38,
          31,
          126,
          185
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Skill/Skill-6.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          3,
          48,
          139,
          188
        ],
        "body": [
          28,
          56,
          98,
          186
        ]
      }
    ],
    "death": [
      {
        "source": "assets/monsters/dungeon-jailer-chief/Dead/Death-1.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          39,
          24,
          181,
          168
        ],
        "body": [
          58,
          31,
          155,
          164
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Dead/Death-2.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          28,
          33,
          181,
          172
        ],
        "body": [
          46,
          44,
          149,
          167
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Dead/Death-3.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          15,
          66,
          182,
          176
        ],
        "body": [
          36,
          73,
          151,
          173
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Dead/Death-4.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          12,
          78,
          191,
          179
        ],
        "body": [
          37,
          84,
          160,
          175
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Dead/Death-5.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          3,
          87,
          192,
          179
        ],
        "body": [
          35,
          92,
          163,
          175
        ]
      },
      {
        "source": "assets/monsters/dungeon-jailer-chief/Dead/Death-6.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          0,
          91,
          192,
          180
        ],
        "body": [
          29,
          99,
          168,
          176
        ]
      }
    ]
  },
  "dungeon-warden": {
    "idle": [
      {
        "source": "assets/monsters/dungeon-warden/Idle/Idle-1@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          42,
          36,
          150,
          156
        ],
        "body": [
          61,
          55,
          112,
          155
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Idle/Idle-2@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          40,
          43,
          149,
          156
        ],
        "body": [
          59,
          56,
          110,
          155
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Idle/Idle-3@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          39,
          39,
          146,
          156
        ],
        "body": [
          59,
          54,
          108,
          155
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Idle/Idle-4@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          39,
          45,
          146,
          156
        ],
        "body": [
          59,
          57,
          109,
          155
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Idle/Idle-5@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          39,
          42,
          146,
          156
        ],
        "body": [
          59,
          57,
          109,
          155
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Idle/Idle-6@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          39,
          48,
          146,
          156
        ],
        "body": [
          59,
          55,
          109,
          155
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Idle/Idle-7@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          39,
          43,
          146,
          156
        ],
        "body": [
          58,
          51,
          110,
          155
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Idle/Idle-8@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          40,
          39,
          149,
          156
        ],
        "body": [
          59,
          57,
          111,
          155
        ]
      }
    ],
    "move": [
      {
        "source": "assets/monsters/dungeon-warden/Walk/Walk-1@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          39,
          33,
          151,
          159
        ],
        "body": [
          66,
          53,
          112,
          158
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Walk/Walk-2@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          39,
          42,
          152,
          159
        ],
        "body": [
          65,
          55,
          113,
          158
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Walk/Walk-3@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          45,
          37,
          158,
          159
        ],
        "body": [
          68,
          53,
          119,
          157
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Walk/Walk-4@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          48,
          46,
          163,
          159
        ],
        "body": [
          70,
          58,
          123,
          157
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Walk/Walk-5@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          51,
          43,
          164,
          159
        ],
        "body": [
          68,
          58,
          124,
          158
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Walk/Walk-6@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          45,
          47,
          158,
          159
        ],
        "body": [
          66,
          54,
          119,
          158
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Walk/Walk-7@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          45,
          40,
          158,
          159
        ],
        "body": [
          68,
          47,
          120,
          157
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Walk/Walk-8@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          45,
          36,
          158,
          160
        ],
        "body": [
          71,
          55,
          121,
          158
        ]
      }
    ],
    "attack": [
      {
        "source": "assets/monsters/dungeon-warden/Attack/Attack1-1@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          27,
          36,
          135,
          156
        ],
        "body": [
          46,
          54,
          96,
          155
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Attack/Attack1-2@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          12,
          43,
          131,
          156
        ],
        "body": [
          45,
          56,
          89,
          155
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Attack/Attack1-3@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          9,
          40,
          128,
          156
        ],
        "body": [
          45,
          54,
          87,
          155
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Attack/Attack1-4@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          6,
          47,
          125,
          156
        ],
        "body": [
          45,
          58,
          86,
          155
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Attack/Attack1-5@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          33,
          50,
          182,
          156
        ],
        "body": [
          49,
          58,
          137,
          155
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Attack/Attack1-6@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          39,
          51,
          185,
          156
        ],
        "body": [
          52,
          56,
          141,
          155
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Attack/Attack1-7@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          39,
          45,
          185,
          156
        ],
        "body": [
          53,
          54,
          142,
          155
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Attack/Attack1-8@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          21,
          39,
          147,
          156
        ],
        "body": [
          47,
          58,
          108,
          155
        ]
      }
    ],
    "hit": [
      {
        "source": "assets/monsters/dungeon-warden/Hurt/Hurt-1@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          39,
          33,
          152,
          159
        ],
        "body": [
          60,
          53,
          111,
          158
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Hurt/Hurt-2@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          36,
          36,
          151,
          159
        ],
        "body": [
          57,
          52,
          110,
          158
        ]
      }
    ],
    "death": [
      {
        "source": "assets/monsters/dungeon-warden/DEATH/Death-1@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          36,
          40,
          156,
          156
        ],
        "body": [
          58,
          52,
          128,
          155
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/DEATH/Death-2@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          30,
          36,
          156,
          156
        ],
        "body": [
          55,
          51,
          120,
          156
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/DEATH/Death-3@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          30,
          42,
          156,
          156
        ],
        "body": [
          53,
          48,
          121,
          156
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/DEATH/Death-4@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          30,
          38,
          158,
          156
        ],
        "body": [
          52,
          49,
          129,
          156
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/DEATH/Death-5@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          30,
          36,
          158,
          156
        ],
        "body": [
          49,
          45,
          137,
          156
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/DEATH/Death-6@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          30,
          90,
          158,
          156
        ],
        "body": [
          44,
          93,
          143,
          156
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/DEATH/Death-7@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          30,
          111,
          158,
          156
        ],
        "body": [
          42,
          113,
          144,
          156
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/DEATH/Death-8@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          30,
          141,
          158,
          156
        ],
        "body": [
          41,
          142,
          145,
          156
        ]
      }
    ],
    "skill_1": [
      {
        "source": "assets/monsters/dungeon-warden/Attack3/Attack3-1@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          42,
          60,
          150,
          177
        ],
        "body": [
          61,
          78,
          111,
          176
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Attack3/Attack3-2@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          39,
          67,
          146,
          177
        ],
        "body": [
          61,
          80,
          109,
          176
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Attack3/Attack3-3@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          51,
          22,
          180,
          177
        ],
        "body": [
          66,
          25,
          155,
          174
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Attack3/Attack3-4@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          51,
          21,
          98,
          177
        ],
        "body": [
          57,
          27,
          91,
          176
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Attack3/Attack3-5@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          48,
          36,
          189,
          177
        ],
        "body": [
          71,
          38,
          175,
          175
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Attack3/Attack3-6@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          51,
          75,
          182,
          177
        ],
        "body": [
          65,
          80,
          144,
          176
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Attack3/Attack3-7@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          51,
          69,
          162,
          177
        ],
        "body": [
          63,
          77,
          127,
          176
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Attack3/Attack3-8@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          34,
          62,
          158,
          177
        ],
        "body": [
          60,
          78,
          120,
          176
        ]
      }
    ],
    "skill_2": [
      {
        "source": "assets/monsters/dungeon-warden/Special/Special-1@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          42,
          44,
          148,
          162
        ],
        "body": [
          62,
          63,
          110,
          161
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Special/Special-2@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          40,
          53,
          148,
          162
        ],
        "body": [
          61,
          63,
          110,
          161
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Special/Special-3@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          40,
          32,
          156,
          162
        ],
        "body": [
          57,
          41,
          107,
          161
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Special/Special-4@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          39,
          31,
          149,
          162
        ],
        "body": [
          58,
          39,
          105,
          161
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Special/Special-5@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          39,
          30,
          146,
          162
        ],
        "body": [
          59,
          47,
          106,
          161
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Special/Special-6@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          40,
          43,
          148,
          162
        ],
        "body": [
          60,
          48,
          106,
          161
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Special/Special-7@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          42,
          37,
          149,
          162
        ],
        "body": [
          62,
          44,
          110,
          161
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/Special/Special-8@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          42,
          31,
          150,
          162
        ],
        "body": [
          61,
          41,
          111,
          161
        ]
      }
    ],
    "skill_3": [
      {
        "source": "assets/monsters/dungeon-warden/RUN/Run-1@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          33,
          36,
          159,
          159
        ],
        "body": [
          73,
          54,
          129,
          156
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/RUN/Run-2@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          33,
          42,
          156,
          159
        ],
        "body": [
          72,
          55,
          130,
          156
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/RUN/Run-3@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          33,
          37,
          158,
          154
        ],
        "body": [
          70,
          51,
          131,
          150
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/RUN/Run-4@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          48,
          49,
          185,
          159
        ],
        "body": [
          79,
          54,
          143,
          158
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/RUN/Run-5@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          60,
          45,
          184,
          159
        ],
        "body": [
          81,
          54,
          145,
          156
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/RUN/Run-6@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          61,
          47,
          187,
          159
        ],
        "body": [
          77,
          52,
          146,
          156
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/RUN/Run-7@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          54,
          37,
          188,
          154
        ],
        "body": [
          76,
          46,
          150,
          150
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/RUN/Run-8@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          48,
          36,
          186,
          159
        ],
        "body": [
          78,
          55,
          143,
          158
        ]
      }
    ],
    "skill_4": [
      {
        "source": "assets/monsters/dungeon-warden/RUN/Run-1@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          33,
          36,
          159,
          159
        ],
        "body": [
          73,
          54,
          129,
          156
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/RUN/Run-2@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          33,
          42,
          156,
          159
        ],
        "body": [
          72,
          55,
          130,
          156
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/RUN/Run-3@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          33,
          37,
          158,
          154
        ],
        "body": [
          70,
          51,
          131,
          150
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/RUN/Run-4@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          48,
          49,
          185,
          159
        ],
        "body": [
          79,
          54,
          143,
          158
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/RUN/Run-5@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          60,
          45,
          184,
          159
        ],
        "body": [
          81,
          54,
          145,
          156
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/RUN/Run-6@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          61,
          47,
          187,
          159
        ],
        "body": [
          77,
          52,
          146,
          156
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/RUN/Run-7@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          54,
          37,
          188,
          154
        ],
        "body": [
          76,
          46,
          150,
          150
        ]
      },
      {
        "source": "assets/monsters/dungeon-warden/RUN/Run-8@3x.png",
        "sourceSize": [
          192,
          192
        ],
        "alpha": [
          48,
          36,
          186,
          159
        ],
        "body": [
          78,
          55,
          143,
          158
        ]
      }
    ]
  }
} as const

export const getMonsterFrameBodyBounds = (
  kind: MonsterFrameBodyMetadataKind,
  action: string,
  frameIndex: number,
): MonsterFrameBodyBounds | undefined => {
  const frames = MONSTER_FRAME_BODY_METADATA[kind][action]
  if (!frames?.length) return undefined
  const index = ((Math.floor(frameIndex) % frames.length) + frames.length) % frames.length
  return frames[index]
}

export const getMonsterFrameBodyMetadataEntries = () => (
  Object.entries(MONSTER_FRAME_BODY_METADATA).flatMap(([kind, actions]) => (
    Object.entries(actions).flatMap(([action, frames]) => frames.map((frame, frameIndex) => ({ kind, action, frameIndex, frame })))
  ))
)
