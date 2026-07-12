import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any unauthenticated user can "create", "read", "update",
and "delete" any "Todo" records.
=========================================================================*/
const schema = a.schema({
    Exam: a
        .model({
            code: a.string().required(),
            title: a.string().required(),
            description: a.string(),
            category: a.string(),
            passScore: a.integer(),
            totalQuestions: a.integer(),
            timeLimitMinutes: a.integer(),
            isPublished: a.boolean().default(false),
        })
        .authorization((allow) => [
            allow.authenticated().to(["read"]),
            allow.groups(["Admins"]),
        ]),

    Question: a
        .model({
            examId: a.id().required(),
            questionNo: a.integer().required(),
            questionText: a.string().required(),
            category: a.string(),
            difficulty: a.string(),
            questionType: a.string(),
            selectionMax: a.integer(),
            score: a.integer(),
            status: a.string(),
        })
        .authorization((allow) => [
            allow.authenticated().to(["read"]),
            allow.groups(["Admins"]),
        ]),

    Choice: a
        .model({
            questionId: a.id().required(),
            label: a.string().required(),
            choiceText: a.string().required(),
            displayOrder: a.integer().required(),
        })
        .authorization((allow) => [
            allow.authenticated().to(["read"]),
            allow.groups(["Admins"]),
        ]),

    QuestionSolution: a
        .model({
            questionId: a.id().required(),
            correctChoiceIds: a.string().array(),
            explanationText: a.string(),
        })
        .authorization((allow) => [
            allow.authenticated().to(["read"]),
            allow.groups(["Admins"]),
        ]),

    QuizSession: a
        .model({
            userId: a.string().required(),
            examId: a.id().required(),
            mode: a.string().required(),
            startedAt: a.datetime().required(),
            submittedAt: a.datetime(),
            totalQuestions: a.integer(),
            correctCount: a.integer(),
            score: a.integer(),
            passScore: a.integer(),
            isPassed: a.boolean(),
            status: a.string(),
        })
        .authorization((allow) => [allow.owner()]),

    QuizAnswer: a
        .model({
            sessionId: a.id().required(),
            questionId: a.id().required(),
            selectedChoiceIds: a.string().array(),
            isCorrect: a.boolean(),
            score: a.integer(),
            answeredAt: a.datetime(),
            explanationShown: a.boolean(),
        })
        .authorization((allow) => [allow.owner()]),

    UserProfile: a
        .model({
            userId: a.string().required(),
            email: a.email(),
            displayName: a.string().required(),
            imageIconPath: a.string(),
            role: a.string(),
            createdAt: a.datetime(),
            updatedAt: a.datetime(),
        })
        .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
    schema,
    authorizationModes: {
        defaultAuthorizationMode: "userPool",
    },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
