import test from "node:test";
import assert from "node:assert/strict";
import { PUBLISH_ARTICLE_SCHEMA, buildPublishOptions } from "../src/publish.ts";
import { parsePublishArticleArgs } from "../src/mcpServer.ts";
import { globalStates } from "../src/utils.ts";

test("publish_article schema exposes comment flags", () => {
    const properties = PUBLISH_ARTICLE_SCHEMA.inputSchema.properties;

    assert.equal(properties.need_open_comment.type, "integer");
    assert.deepEqual(properties.need_open_comment.enum, [0, 1]);
    assert.equal(properties.only_fans_can_comment.type, "integer");
    assert.deepEqual(properties.only_fans_can_comment.enum, [0, 1]);
});

test("buildPublishOptions includes comment flags", () => {
    globalStates.serverUrl = "http://localhost:3000";
    globalStates.apiKey = "test-api-key";

    const publishOptions = buildPublishOptions({
        contentUrl: "./tests/publish.md",
        file: "",
        content: "# Hello",
        themeId: "phycat",
        appId: "wx123",
        clientVersion: "2.0.2",
        needOpenComment: 1,
        onlyFansCanComment: 1,
    });

    assert.equal(publishOptions.file, "./tests/publish.md");
    assert.equal(publishOptions.server, "http://localhost:3000");
    assert.equal(publishOptions.apiKey, "test-api-key");
    assert.equal(publishOptions.need_open_comment, 1);
    assert.equal(publishOptions.only_fans_can_comment, 1);
});

test("parsePublishArticleArgs preserves comment flags", () => {
    const parsed = parsePublishArticleArgs(
        {
            content: "# Hello",
            content_url: "https://example.com/post.md",
            file: "./tests/publish.md",
            theme_id: "phycat",
            app_id: "wx123",
            need_open_comment: 1,
            only_fans_can_comment: 1,
        },
        "2.0.2",
    );

    assert.equal(parsed.content, "# Hello");
    assert.equal(parsed.contentUrl, "https://example.com/post.md");
    assert.equal(parsed.file, "./tests/publish.md");
    assert.equal(parsed.themeId, "phycat");
    assert.equal(parsed.appId, "wx123");
    assert.equal(parsed.clientVersion, "2.0.2");
    assert.equal(parsed.needOpenComment, 1);
    assert.equal(parsed.onlyFansCanComment, 1);
});

test("parsePublishArticleArgs ignores invalid comment flag values", () => {
    const parsed = parsePublishArticleArgs(
        {
            need_open_comment: "1",
            only_fans_can_comment: 2,
        },
        "2.0.2",
    );

    assert.equal(parsed.needOpenComment, undefined);
    assert.equal(parsed.onlyFansCanComment, undefined);
});

test("buildPublishOptions only keeps follower comment flag when comments are enabled", () => {
    globalStates.serverUrl = "http://localhost:3000";
    globalStates.apiKey = "test-api-key";

    const publishOptions = buildPublishOptions({
        contentUrl: "./tests/publish.md",
        file: "",
        content: "# Hello",
        themeId: "phycat",
        needOpenComment: 0,
        onlyFansCanComment: 1,
    });

    assert.equal(publishOptions.need_open_comment, 0);
    assert.equal(publishOptions.only_fans_can_comment, undefined);
});
