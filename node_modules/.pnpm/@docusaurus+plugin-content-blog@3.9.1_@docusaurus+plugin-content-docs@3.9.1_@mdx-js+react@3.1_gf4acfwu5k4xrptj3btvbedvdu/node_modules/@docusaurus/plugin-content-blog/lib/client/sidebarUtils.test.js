/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { groupBlogSidebarItemsByYear } from './sidebarUtils';
describe('groupBlogSidebarItemsByYear', () => {
    const post1 = {
        title: 'post1',
        permalink: '/post1',
        date: '2024-10-03',
        unlisted: false,
    };
    const post2 = {
        title: 'post2',
        permalink: '/post2',
        date: '2024-05-02',
        unlisted: false,
    };
    const post3 = {
        title: 'post3',
        permalink: '/post3',
        date: '2022-11-18',
        unlisted: false,
    };
    it('can group items by year', () => {
        const items = [post1, post2, post3];
        const entries = groupBlogSidebarItemsByYear(items);
        expect(entries).toEqual([
            ['2024', [post1, post2]],
            ['2022', [post3]],
        ]);
    });
    it('always returns result in descending chronological order', () => {
        const items = [post3, post1, post2];
        const entries = groupBlogSidebarItemsByYear(items);
        expect(entries).toEqual([
            ['2024', [post1, post2]],
            ['2022', [post3]],
        ]);
    });
});
