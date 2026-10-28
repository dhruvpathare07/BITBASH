const pythonQuestions = [
  { code: "x = 3\nprint(x + 2)", options: ["3", "5", "6", "32"], correct: "B" },
  { code: "for i in range(3):\n    print(i, end=' ')", options: ["1 2 3", "0 1 2", "0 1 2 3", "3"], correct: "B" },
  { code: "values = [2, 4, 6, 8]\nprint(values[1] + values[2])", options: ["6", "8", "10", "12"], correct: "C" },
  { code: "x = 10\nif x > 5:\n    print('YES')\nelse:\n    print('NO')", options: ["NO", "10", "YES", "TRUE"], correct: "C" },
  { code: "total = 0\nfor n in [1, 2, 3]:\n    total += n\nprint(total)", options: ["5", "123", "6", "3"], correct: "C" },
  { code: "word = 'CODE'\nprint(word[1])", options: ["C", "O", "D", "E"], correct: "B" },
  { code: "print(7 // 2)", options: ["3", "3.5", "4", "2"], correct: "A" },
  { code: "x = 4\nx *= 2\nprint(x)", options: ["6", "42", "8", "2"], correct: "C" },
  { code: "nums = [1, 3, 5]\nprint(nums[-1])", options: ["1", "3", "-1", "5"], correct: "D" },
  { code: "a = 5\nb = 2\nprint(a % b)", options: ["2", "1", "2.5", "0"], correct: "B" },
];

const cQuestions = [
  { code: '#include <stdio.h>\nint main(void) {\n    printf("%d", 3 + 2);\n    return 0;\n}', options: ["3", "5", "6", "32"], correct: "B" },
  { code: '#include <stdio.h>\nint main(void) {\n    for (int i = 0; i < 3; i++) printf("%d ", i);\n    return 0;\n}', options: ["1 2 3", "0 1 2", "0 1 2 3", "3"], correct: "B" },
  { code: "int values[] = {2, 4, 6, 8};\nprintf(\"%d\", values[1] + values[2]);", options: ["6", "8", "10", "12"], correct: "C" },
  { code: 'int x = 10;\nif (x > 5) printf("YES");\nelse printf("NO");', options: ["NO", "10", "YES", "TRUE"], correct: "C" },
  { code: "int total = 0;\nfor (int n = 1; n <= 3; n++) total += n;\nprintf(\"%d\", total);", options: ["5", "123", "6", "3"], correct: "C" },
  { code: 'char word[] = "CODE";\nprintf("%c", word[1]);', options: ["C", "O", "D", "E"], correct: "B" },
  { code: 'printf("%d", 7 / 2);', options: ["3", "3.5", "4", "2"], correct: "A" },
  { code: "int x = 4;\nx *= 2;\nprintf(\"%d\", x);", options: ["6", "42", "8", "2"], correct: "C" },
  { code: 'int nums[] = {1, 3, 5};\nprintf("%d", nums[2]);', options: ["1", "3", "2", "5"], correct: "D" },
  { code: 'printf("%d", 5 % 2);', options: ["2", "1", "2.5", "0"], correct: "B" },
];

export const LOGIC_MAZE_QUESTIONS = {
  python: pythonQuestions.map((q, index) => ({ ...q, id: index + 1, number: index + 1 })),
  c: cQuestions.map((q, index) => ({ ...q, id: index + 1, number: index + 1 })),
};

export function validateLogicMazeQuestions() {
  for (const [language, questions] of Object.entries(LOGIC_MAZE_QUESTIONS)) {
    if (questions.length !== 10) throw new Error(`${language}: expected 10 questions`);
    questions.forEach((question, index) => {
      if (question.options.length !== 4) throw new Error(`${language} question ${index + 1}: expected 4 options`);
      if (new Set(question.options).size !== 4) throw new Error(`${language} question ${index + 1}: options must be distinct`);
      if (!["A", "B", "C", "D"].includes(question.correct)) throw new Error(`${language} question ${index + 1}: invalid correct endpoint`);
    });
  }
  return true;
}
