/**
 *   Needleman-Wunsch algorithm is an procedure to compute the optimal global alignment of two string
 *   sequences by S.B.Needleman and C.D.Wunsch (1970).
 *
 *   Aside from the inputs, you can assign the scores for,
 *   - Match: The two characters at the current index are same.
 *   - Mismatch: The two characters at the current index are different.
 *   - Insertion/Deletion(gaps): The best alignment involves one letter aligning to a gap in the other string.
 */

class NeedlemanWunsch {
    constructor(sequence1, sequence2, match_score = 1, mismatch_penalty = -1, gap_penalty = -1) {
        this.sequence1 = sequence1;
        this.sequence2 = sequence2;
        this.match_score = match_score;
        this.mismatch_penalty = mismatch_penalty;
        this.gap_penalty = gap_penalty;

        // Just the remove redundancy
        this.iMax = sequence1.length + 1;
        this.jMax = sequence2.length + 1;

        // Grid matrix of scores
        this.grid = new Array(this.iMax);
        for(let i = 0; i < this.iMax; i++){
            this.grid[i] = new Array(this.jMax );

            for(let j = 0; j < this.jMax ; j++)
                this.grid[i][j] = 0;
        }

        // Traceback matrix (2D array, each cell is an array of boolean values for [`Diag`, `Up`, `Left`] positions)
        this.tracebackGrid = new Array(this.iMax);
        for(let i = 0; i < this.iMax; i++) {
            this.tracebackGrid[i] = new Array(this.jMax);

            for(let j = 0; j < this.jMax ; j++)
                this.tracebackGrid[i][j] = [null, null, null];
        }

        // The aligned sequences (return multiple possibilities)
        this.alignments = [];

        // Final alignment score
        this.score = -1;

        // Calculate scores and tracebacks
        this.computeGrids();
    }

    getScore(){
        return this.score;
    }

    getAlignments(){
        return this.alignments;
    }

    // Main dynamic programming procedure
    computeGrids(){
        // Fill in the first row
        for (let j = 1; j < this.jMax; j++) {
            this.grid[0][j] = this.grid[0][j-1] + this.gap_penalty;
            this.tracebackGrid[0][j] = [false, false, true];
        }

        // Fill in the first column
        for (let i = 1; i < this.iMax; i++) {
            this.grid[i][0] = this.grid[i-1][0] + this.gap_penalty;
            this.tracebackGrid[i][0] = [false, true, false];
        }

        // Fill the rest of the grid
        for(let i = 1; i < this.iMax; i++){
            for(let j = 1; j < this.jMax; j++){
                // Find the max score(s) among [`Diag`, `Up`, `Left`]
                let diag;
                if(this.sequence1[i-1] === this.sequence2[j-1])
                    diag = this.grid[i-1][j-1] + this.match_score;
                else
                    diag = this.grid[i-1][j-1] + this.mismatch_penalty;

                let up = this.grid[i-1][j] + this.gap_penalty;
                let left = this.grid[i][j-1] + this.gap_penalty;

                // If there exists multiple max values, capture them for multiple paths
                let maxOf = [diag,up,left];
                let indices = this.arrayAllMaxIndexes(maxOf);

                // Update Grids
                this.grid[i][j] = maxOf[indices[0]];
                this.tracebackGrid[i][j] = [indices.includes(0), indices.includes(1), indices.includes(2)];
            }
        }

        // Update alignment score
        this.score = this.grid[this.iMax-1][this.jMax-1];
    }

    // Gets all possible valid sequence combinations
    alignmentTraceback(){
        let inProcessAlignments = [];

        inProcessAlignments.push({ pos: [this.sequence1.length, this.sequence2.length],
            seq1: "",
            seq2: ""
        });

        while(inProcessAlignments[0]){
            let current = inProcessAlignments[0];
            let directions = this.tracebackGrid[current.pos[0]][current.pos[1]];

            if(directions[0]){
                inProcessAlignments.push({ pos: [current.pos[0]-1, current.pos[1]-1],
                    seq1: (this.sequence1[current.pos[0]-1] + current.seq1),
                    seq2: (this.sequence2[current.pos[1]-1] + current.seq2)
                });
            }
            if(directions[1]){
                inProcessAlignments.push({ pos: [current.pos[0]-1, current.pos[1]],
                    seq1: this.sequence1[current.pos[0]-1] + current.seq1,
                    seq2: '-' + current.seq2
                });
            }
            if(directions[2]){
                inProcessAlignments.push({ pos: [current.pos[0], current.pos[1]-1],
                    seq1:'-' + current.seq1,
                    seq2: this.sequence2[current.pos[1]-1] + current.seq2
                });
            }

            if(current.pos[0] === 0 && current.pos[1] === 0)
                this.alignments.push({sequence1 : current.seq1,
                    sequence2: current.seq2
                });

            inProcessAlignments.shift();
        }

        return this.alignments;
    }

    // Helper Functions

    getAllIndexes(arr, val) {
        let indexes = [], i = -1;
        while ((i = arr.indexOf(val, i+1)) !== -1){
            indexes.push(i);
        }
        return indexes;
    }

    arrayAllMaxIndexes(array){
        return this.getAllIndexes(array, Math.max.apply(null, array));
    }
}

module.exports = NeedlemanWunsch;