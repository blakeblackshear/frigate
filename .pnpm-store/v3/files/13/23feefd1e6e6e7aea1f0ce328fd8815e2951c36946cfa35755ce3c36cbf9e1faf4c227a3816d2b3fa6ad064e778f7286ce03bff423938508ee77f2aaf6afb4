/**
 * A classic Quicksort algorithm with Hoare's partition
 * - Works also on LinkedList objects
 *
 * Copyright: i-Vis Research Group, Bilkent University, 2007 - present
 */

const LinkedList = require('./LinkedList.js');

class Quicksort {
    constructor(A, compareFunction) {
        if(compareFunction !== null || compareFunction !== undefined)
            this.compareFunction = this._defaultCompareFunction;

        let length;
        if( A instanceof LinkedList )
            length = A.size();
        else
            length = A.length;

        this._quicksort(A, 0, length - 1);
    }

    _quicksort(A, p, r){
        if(p < r) {
            let q = this._partition(A, p, r);
            this._quicksort(A, p, q);
            this._quicksort(A, q + 1, r);
        }
    }

    _partition(A, p, r){
        let x = this._get(A, p);
        let i = p;
        let j = r;
        while(true){
            while (this.compareFunction(x, this._get(A, j)))
                j--;
            while (this.compareFunction(this._get(A, i), x))
                i++;

            if (i < j){
                this._swap(A, i, j);
                i++;
                j--;
            }
            else
                return j;
        }
    }

    _get(object, index){
        if( object instanceof LinkedList)
            return object.get_object_at(index);
        else
            return object[index];
    }

    _set(object, index, value){
        if( object instanceof LinkedList)
            object.set_object_at(index, value);
        else
            object[index] = value;
    }

    _swap(A, i, j){
        let temp = this._get(A, i);
        this._set(A, i, this._get(A, j));
        this._set(A, j, temp);
    }

    _defaultCompareFunction(a, b){
        return b > a;
    }
}

module.exports = Quicksort;