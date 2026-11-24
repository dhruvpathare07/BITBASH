
const pythonQuestions = [
  // 1. EASY
  {
    code: "x = 5\ny = 2\nprint(x - y * 2)",
    options: ["1", "3", "6", "10"],
    correct: "A"
  },

  // 2. EASY
  {
    code: "total = 0\nfor n in range(1, 5):\n    if n % 2 != 0:\n        total += n\nprint(total)",
    options: ["4", "6", "10", "15"],
    correct: "A"
  },

  // 3. EASY
  {
    code: "values = [2, 4, 6]\nvalues[1] = values[0] + values[2]\nprint(values[1] - values[0])",
    options: ["4", "6", "8", "10"],
    correct: "B"
  },

  // 4. MEDIUM
  {
    code: "total = 0\nfor n in range(1, 6):\n    if n % 2 == 0:\n        continue\n    total += n\nprint(total)",
    options: ["6", "8", "9", "15"],
    correct: "C"
  },

  // 5. MEDIUM
  {
    code: "a = 17\nprint(a // 5 + a % 5)",
    options: ["3", "4", "5", "7"],
    correct: "C"
  },

  // 6. MEDIUM
  // 6. MEDIUM 
{
  code: "def calculate(n):\n    total = 0\n    for i in range(1, n + 1):\n        if i % 2 == 0:\n            total += i\n    return total\n\nprint(calculate(6))",
  options: ["6", "9", "12", "15"],
  correct: "C"
},

  // 7. HARD
  {
    code: "x = 2\nfor i in range(3):\n    x += i\n    if x % 2 == 0:\n        x //= 2\nprint(x)",
    options: ["1", "2", "3", "4"],
    correct: "C"
  },

  // 8. HARD
  {
    code: "n = 23\ncount = 0\nwhile n > 1:\n    if n % 2 == 0:\n        n //= 2\n    else:\n        n -= 3\n    count += 1\nprint(count)",
    options: ["3", "4", "5", "6"],
    correct: "C"
  },

  // 9. VERY HARD
  {
    code: "a = [3, 1, 4]\nfor i in range(2):\n    if a[i] < a[i + 1]:\n        a[i], a[i + 1] = a[i + 1], a[i]\nprint(a[1] + a[2])",
    options: ["4", "5", "7", "8"],
    correct: "B"
  },

  // 10. VERY HARD
  {
    code: "def f(n):\n    if n <= 1:\n        return 1\n    return n - f(n - 2)\nprint(f(6))",
    options: ["1", "2", "3", "4"],
    correct: "C"
  }
];


const cQuestions = [
  // 1. EASY
  {
    code: '#include <stdio.h>\nint main(void) {\n    int x = 5, y = 2;\n    printf("%d", x - y * 2);\n    return 0;\n}',
    options: ["1", "3", "6", "10"],
    correct: "A"
  },

  // 2. EASY
  {
    code: '#include <stdio.h>\nint main(void) {\n    int total = 0;\n    for (int n = 1; n < 5; n++)\n        if (n % 2 != 0) total += n;\n    printf("%d", total);\n    return 0;\n}',
    options: ["4", "6", "10", "15"],
    correct: "A"
  },

  // 3. EASY
  {
    code: '#include <stdio.h>\nint main(void) {\n    int v[] = {2, 4, 6};\n    v[1] = v[0] + v[2];\n    printf("%d", v[1] - v[0]);\n    return 0;\n}',
    options: ["4", "6", "8", "10"],
    correct: "B"
  },

  // 4. MEDIUM
  {
    code: '#include <stdio.h>\nint main(void) {\n    int total = 0;\n    for (int n = 1; n <= 5; n++) {\n        if (n % 2 == 0) continue;\n        total += n;\n    }\n    printf("%d", total);\n    return 0;\n}',
    options: ["6", "8", "9", "15"],
    correct: "C"
  },

  // 5. MEDIUM
  {
    code: '#include <stdio.h>\nint main(void) {\n    int a = 17;\n    printf("%d", a / 5 + a % 5);\n    return 0;\n}',
    options: ["3", "4", "5", "7"],
    correct: "C"
  },

  // 6. MEDIUM 
{
  code: '#include <stdio.h>\n\nint calculate(int n) {\n    int total = 0;\n    for (int i = 1; i <= n; i++) {\n        if (i % 2 == 0)\n            total += i;\n    }\n    return total;\n}\n\nint main(void) {\n    printf("%d", calculate(6));\n    return 0;\n}',
  options: ["6", "9", "12", "15"],
  correct: "C"
},
  // 7. HARD
  {
    code: '#include <stdio.h>\nint main(void) {\n    int x = 2;\n    for (int i = 0; i < 3; i++) {\n        x += i;\n        if (x % 2 == 0) x /= 2;\n    }\n    printf("%d", x);\n    return 0;\n}',
    options: ["1", "2", "3", "4"],
    correct: "C"
  },

  // 8. HARD
  {
    code: '#include <stdio.h>\nint main(void) {\n    int n = 23, count = 0;\n    while (n > 1) {\n        if (n % 2 == 0) n /= 2;\n        else n -= 3;\n        count++;\n    }\n    printf("%d", count);\n    return 0;\n}',
    options: ["3", "4", "5", "6"],
    correct: "C"
  },

  // 9. VERY HARD
  {
    code: '#include <stdio.h>\nint main(void) {\n    int a[] = {3, 1, 4}, temp;\n    for (int i = 0; i < 2; i++) {\n        if (a[i] < a[i + 1]) {\n            temp = a[i];\n            a[i] = a[i + 1];\n            a[i + 1] = temp;\n        }\n    }\n    printf("%d", a[1] + a[2]);\n    return 0;\n}',
    options: ["4", "5", "7", "8"],
    correct: "B"
  },

  // 10. VERY HARD
  {
    code: '#include <stdio.h>\nint f(int n) {\n    if (n <= 1) return 1;\n    return n - f(n - 2);\n}\nint main(void) {\n    printf("%d", f(6));\n    return 0;\n}',
    options: ["1", "2", "3", "4"],
    correct: "C"
  }
];


export const LOGIC_MAZE_QUESTIONS = {
  python: pythonQuestions.map((q, index) => ({
    ...q,
    id: index + 1,
    number: index + 1
  })),
  c: cQuestions.map((q, index) => ({
    ...q,
    id: index + 1,
    number: index + 1
  })),
};


export function validateLogicMazeQuestions() {
  for (const [language, questions] of Object.entries(LOGIC_MAZE_QUESTIONS)) {
    if (questions.length !== 10)
      throw new Error(`${language}: expected 10 questions`);

    questions.forEach((question, index) => {
      if (question.options.length !== 4)
        throw new Error(`${language} question ${index + 1}: expected 4 options`);

      if (new Set(question.options).size !== 4)
        throw new Error(`${language} question ${index + 1}: options must be distinct`);

      if (!["A", "B", "C", "D"].includes(question.correct))
        throw new Error(`${language} question ${index + 1}: invalid correct endpoint`);
    });
  }

  return true;
}
