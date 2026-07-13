type ExtractQuestionFromImagesEvent = {
    arguments: {
        questionImagePath?: string | null;
        explanationImagePath?: string | null;
    };
};

export const handler = async (event: ExtractQuestionFromImagesEvent) => {
    console.log("extractQuestionFromImages event:", JSON.stringify(event));

    const { questionImagePath, explanationImagePath } = event.arguments;

    if (!questionImagePath || !explanationImagePath) {
        throw new Error(
            "questionImagePath and explanationImagePath are required.",
        );
    }

    return JSON.stringify({
        examCode: "G-001",
        questionNo: 7,
        questionText:
            "あるコンピュータが人工知能であるか否かを判定するためのテストとして、チューリングテストが知られている。チューリングテストの具体的な方法として、最も適切なものを選べ。",
        category: "人工知能",
        difficulty: "NORMAL",
        questionType: "SINGLE",
        correctLabels: ["B"],
        explanation:
            "チューリングテストは、アラン・チューリングによって考案された、コンピュータが人工知能かどうかを判定するためのテストです。人間の審査員に相手がコンピュータであることを伏せて対話させ、相手が人間であると思わせることができるかを評価します。",
        choices: [
            {
                label: "A",
                choiceText:
                    "同じコンピュータをもう1つ用意し、コンピュータ同士での会話がどの程度成立するかを評価する",
            },
            {
                label: "B",
                choiceText:
                    "人間の審査員に相手がコンピュータであることを伏せて対話させ、対話の相手が人間であると思わせることができるかを評価する",
            },
            {
                label: "C",
                choiceText:
                    "人間とコンピュータに同じ問題を解かせて、正解率が同じくらいかどうかを評価する",
            },
            {
                label: "D",
                choiceText:
                    "コンピュータが作成した長い文章を人間の審査員に読んでもらい、その文章表現の人間らしさを評価する",
            },
        ],
    });
};
