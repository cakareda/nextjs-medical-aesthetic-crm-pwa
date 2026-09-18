export const FORM_CONFIGS = {
  // 1. DOLGU UYGULAMASI ONAM FORMU
  'dolgu_uygulama_onam_fromu.pdf': {
    date: { x: 465, y: 798 },
    patientName: { x: 154, y: 772 },
    birthDate: { x: 418, y: 772 },

    answersMap: {
      q1:  { evet: { x: 109, y: 531 }, hayir: { x: 154, y: 527 } },
      q2:  { evet: { x: 340, y: 530 }, hayir: { x: 377, y: 530 } },
      q3:  { evet: { x: 106, y: 492 }, hayir: { x: 141, y: 491 } },
      q4:  { evet: { x: 338, y: 495 }, hayir: { x: 380, y: 495 } },
      q5:  { evet: { x: 108, y: 457 }, hayir: { x: 145, y: 457 } },
      q6:  { evet: { x: 340, y: 455 }, hayir: { x: 373, y: 454 } },
      q7:  { evet: { x: 114, y: 424 }, hayir: { x: 141, y: 422 } },
      q8:  { evet: { x: 340, y: 421 }, hayir: { x: 383, y: 420 } },
      q9:  { evet: { x: 117, y: 372 }, hayir: { x: 150, y: 368 } },
      q10: { evet: { x: 353, y: 361 }, hayir: { x: 388, y: 362 } },
      q11: { evet: { x: 113, y: 296 }, hayir: { x: 145, y: 297 } },
      q12: { evet: { x: 338, y: 308 }, hayir: { x: 381, y: 306 } },
      q13: { evet: { x: 107, y: 250 }, hayir: { x: 149, y: 247 } },
      q14: { evet: { x: 337, y: 249 }, hayir: { x: 379, y: 247 } },
      q15: { evet: { x: 105, y: 195 }, hayir: { x: 152, y: 197 } },
      q16: { evet: { x: 333, y: 195 }, hayir: { x: 380, y: 193 } },
    },

    signatures: {
      page1: {
        patient: { name: { x: 57, y: 145 }, box: { x: 72, y: 106, w: 90, h: 26 } },
        witness: { box: { x: 230, y: 104, w: 90, h: 26 } },
        doctor:  { name: { x: 364, y: 146 }, box: { x: 379, y: 102, w: 90, h: 26 } },
      },
      page2: {
        patient: { name: { x: 59, y: 214 }, box: { x: 80, y: 174, w: 90, h: 26 } },
        witness: { box: { x: 230, y: 173, w: 90, h: 26 } },
        doctor:  { name: { x: 366, y: 219 }, box: { x: 391, y: 175, w: 90, h: 26 } },
      },
    },
  },

  // 2. BOTOKS (BOTULINUM TOKSIN) ONAM FORMU
  'botilinum_toksin_uygulamalari_onam_formu.pdf': {
    date: { x: 502, y: 746 },
    patientName: { x: 155, y: 723 },
    birthDate: { x: 458, y: 723 },

    answersMap: {
      q1:  { evet: { x: 110, y: 473 }, hayir: { x: 146, y: 474 } },
      q2:  { evet: { x: 341, y: 474 }, hayir: { x: 377, y: 474 } },
      q3:  { evet: { x: 104, y: 439 }, hayir: { x: 141, y: 438 } },
      q4:  { evet: { x: 340, y: 439 }, hayir: { x: 374, y: 441 } },
      q5:  { evet: { x: 112, y: 401 }, hayir: { x: 147, y: 401 } },
      q6:  { evet: { x: 335, y: 403 }, hayir: { x: 377, y: 401 } },
      q7:  { evet: { x: 111, y: 365 }, hayir: { x: 149, y: 369 } },
      q8:  { evet: { x: 338, y: 367 }, hayir: { x: 377, y: 367 } },
      q9:  { evet: { x: 109, y: 315 }, hayir: { x: 144, y: 315 } },
      q10: { evet: { x: 350, y: 307 }, hayir: { x: 390, y: 308 } },
      q11: { evet: { x: 109, y: 241 }, hayir: { x: 150, y: 238 } },
      q12: { evet: { x: 337, y: 252 }, hayir: { x: 377, y: 251 } },
      q13: { evet: { x: 108, y: 193 }, hayir: { x: 146, y: 192 } },
      q14: { evet: { x: 337, y: 191 }, hayir: { x: 376, y: 193 } },
      q15: { evet: { x: 108, y: 139 }, hayir: { x: 146, y: 143 } },
      q16: { evet: { x: 337, y: 142 }, hayir: { x: 374, y: 141 } },
    },

    signatures: {
      page1: {
        patient: { name: { x: 66, y: 88 }, box: { x: 74, y: 50, w: 90, h: 26 } },
        witness: { box: { x: 231, y: 46, w: 90, h: 26 } },
        doctor:  { name: { x: 384, y: 92 }, box: { x: 376, y: 48, w: 90, h: 26 } },
      },
      page2: {
        patient: { name: { x: 62, y: 150 }, box: { x: 75, y: 111, w: 90, h: 26 } },
        witness: { box: { x: 228, y: 111, w: 90, h: 26 } },
        doctor:  { name: { x: 377, y: 149 }, box: { x: 384, y: 109, w: 90, h: 26 } },
      },
    },
  },

  // 3. MEZOTERAPİ ONAM FORMU
  'mezoterapi_onam_formu.pdf': {
    patientName: { x: 166, y: 706 },
    age: { x: 457, y: 705 },
    gender: { x: 555, y: 707 },
    date: { x: 165, y: 663 },
    time: { x: 495, y: 664 },

    answersMap: {
      q1:  { evet: { x: 234, y: 427 }, hayir: { x: 278, y: 428 } },
      q2:  { evet: { x: 524, y: 431 }, hayir: { x: 564, y: 430 } },
      q3:  { evet: { x: 234, y: 399 }, hayir: { x: 277, y: 398 } },
      q4:  { evet: { x: 524, y: 399 }, hayir: { x: 564, y: 397 } },
      q5:  { evet: { x: 233, y: 364 }, hayir: { x: 276, y: 365 } },
      q6:  { evet: { x: 524, y: 367 }, hayir: { x: 561, y: 365 } },
      q7:  { evet: { x: 233, y: 335 }, hayir: { x: 278, y: 336 } },
      q8:  { evet: { x: 525, y: 335 }, hayir: { x: 564, y: 333 } },
      q9:  { evet: { x: 234, y: 308 }, hayir: { x: 278, y: 307 } },
      q10: { evet: { x: 525, y: 308 }, hayir: { x: 562, y: 307 } },
      q11: { evet: { x: 234, y: 271 }, hayir: { x: 278, y: 271 } },
      q12: { evet: { x: 524, y: 272 }, hayir: { x: 562, y: 271 } },
      q13: { evet: { x: 233, y: 227 }, hayir: { x: 277, y: 227 } },
      q14: { evet: { x: 524, y: 229 }, hayir: { x: 561, y: 229 } },
      q15: { evet: { x: 234, y: 197 }, hayir: { x: 278, y: 195 } },
    },

    signatures: {
      page1: {
        patient: { name: { x: 58, y: 89 }, box: { x: 60, y: 50, w: 90, h: 26 } },
        witness: { box: { x: 241, y: 49, w: 90, h: 26 } },
        doctor:  { name: { x: 411, y: 89 }, box: { x: 426, y: 51, w: 90, h: 26 } },
      },
      page2: {
        patient: { name: { x: 62, y: 150 }, box: { x: 65, y: 111, w: 90, h: 26 } },
        witness: { box: { x: 220, y: 111, w: 90, h: 26 } },
        doctor:  { name: { x: 377, y: 149 }, box: { x: 391, y: 109, w: 90, h: 26 } },
      },
    },
  },
};