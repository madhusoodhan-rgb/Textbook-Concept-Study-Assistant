from pathlib import Path
import pymupdf

def create_sample_books():
    books_dir = Path("backend/data/books")
    books_dir.mkdir(parents=True, exist_ok=True)

    # Book 1: Fundamentals of Data Structures and Algorithms
    doc1 = pymupdf.open()
    
    # Page 1: Chapter 1 - Asymptotic Analysis
    p1 = doc1.new_page()
    p1.insert_text((50, 60), "Fundamentals of Data Structures & Algorithms", fontsize=18, fontname="helv")
    p1.insert_text((50, 85), "Authors: Dr. Robert Sedgewick & Dr. Alan Turing", fontsize=11, fontname="helv")
    p1.insert_text((50, 105), "Subject: Computer Science", fontsize=10, fontname="helv")
    p1.insert_text((50, 135), "Chapter 1: Asymptotic Analysis and Big-O Notation", fontsize=14, fontname="helv")
    p1.insert_text((50, 165), 
        "Asymptotic analysis is a mathematical framework used to evaluate the runtime and resource\n"
        "consumption of algorithms as the input size n grows indefinitely toward infinity.\n\n"
        "1.1 Big-O Notation (O)\n"
        "Big-O notation establishes a formal asymptotic upper bound on the growth rate of an algorithm.\n"
        "Formally, a function f(n) is in O(g(n)) if there exist positive constants c and n0 such that\n"
        "0 <= f(n) <= c * g(n) for all n >= n0.\n\n"
        "For example, a linear search scanning an unsorted array of size n has a worst-case time\n"
        "complexity of O(n). In contrast, binary search operates on a sorted array by dividing the search\n"
        "space in half at each step, yielding logarithmic complexity O(log n).\n\n"
        "1.2 Essential Complexity Classes:\n"
        "- Constant Time O(1): Accessing an element in an array by index.\n"
        "- Logarithmic Time O(log n): Binary search in a sorted array.\n"
        "- Linear Time O(n): Traversing a singly linked list.\n"
        "- Linearithmic Time O(n log n): Divide-and-conquer sorting like Merge Sort and Heap Sort.\n"
        "- Quadratic Time O(n^2): Nested comparison loops like Bubble Sort and Insertion Sort.\n"
        "- Exponential Time O(2^n): Recursive solutions to the traveling salesperson problem.",
        fontsize=10,
        fontname="helv"
    )
    
    # Page 2: Chapter 2 - Tree Structures
    p2 = doc1.new_page()
    p2.insert_text((50, 60), "Chapter 2: Trees and Balanced Search Trees", fontsize=14, fontname="helv")
    p2.insert_text((50, 95),
        "A tree is a non-linear hierarchical data structure consisting of nodes connected by edges.\n\n"
        "2.1 Binary Search Tree (BST) Invariant:\n"
        "For every node X with key k in a binary search tree:\n"
        "- Every node in the left subtree of X has a key strictly less than k.\n"
        "- Every node in the right subtree of X has a key strictly greater than or equal to k.\n\n"
        "When a BST remains balanced, basic operations (search, insert, delete) run in O(log n) time.\n"
        "However, in the degenerate worst case (such as inserting keys in sorted order), the tree degenerates\n"
        "into a linear linked list with O(n) performance.\n\n"
        "2.2 AVL Trees and Self-Balancing Invariants:\n"
        "An AVL tree (named after Adelson-Velsky and Landis) enforces logarithmic balance through rotations.\n"
        "The balance factor of any node X is defined as: BalanceFactor(X) = height(left) - height(right).\n"
        "In an AVL tree, the balance factor of every node must be in {-1, 0, 1}.\n"
        "Whenever an insertion or deletion violates this property, tree rotations restore balance:\n"
        "- Single Left Rotation (LL): applied when insertion is in the right child of right child.\n"
        "- Single Right Rotation (RR): applied when insertion is in the left child of left child.\n"
        "- Double Left-Right Rotation (LR) and Right-Left Rotation (RL): handle zigzag imbalances.",
        fontsize=10,
        fontname="helv"
    )
    
    # Page 3: Chapter 3 - Graph Algorithms
    p3 = doc1.new_page()
    p3.insert_text((50, 60), "Chapter 3: Graph Traversal and Shortest Paths", fontsize=14, fontname="helv")
    p3.insert_text((50, 95),
        "Graphs G = (V, E) model networks of relationships between vertices V and connecting edges E.\n\n"
        "3.1 Breadth-First Search (BFS) vs Depth-First Search (DFS):\n"
        "Breadth-First Search traverses vertices in order of increasing distance from the source.\n"
        "BFS employs a Queue (FIFO) and computes shortest paths in unweighted graphs in O(V + E) time.\n"
        "Depth-First Search explores paths to maximum depth before backtracking, implemented via recursion\n"
        "or an explicit Stack (LIFO). DFS is widely used in topological sorting and cycle detection.\n\n"
        "3.2 Dijkstra's Single-Source Shortest Path Algorithm:\n"
        "Dijkstra's algorithm finds minimum cost paths from a source vertex to all other vertices in a graph\n"
        "with non-negative edge weights.\n"
        "With a binary min-priority heap, the time complexity is O((V + E) log V).\n"
        "Algorithm Execution:\n"
        "1. Set dist[source] = 0 and dist[v] = infinity for all v != source.\n"
        "2. Insert (dist[source], source) into the priority queue.\n"
        "3. While the priority queue is not empty, pop vertex u with minimum distance.\n"
        "4. For each neighbor v with edge weight w(u, v): if dist[u] + w(u, v) < dist[v], update dist[v]\n"
        "   and push the relaxed distance into the priority queue.",
        fontsize=10,
        fontname="helv"
    )

    doc1.set_toc([
        [1, "Chapter 1: Asymptotic Analysis and Big-O Notation", 1],
        [1, "Chapter 2: Trees and Balanced Search Trees", 2],
        [1, "Chapter 3: Graph Traversal and Shortest Paths", 3],
    ])
    doc1.save(str(books_dir / "data_structures_and_algorithms.pdf"))
    doc1.close()

    # Book 2: Principles of Artificial Intelligence and Machine Learning
    doc2 = pymupdf.open()
    
    # Page 1: Chapter 1 - Supervised Learning & Gradient Descent
    p21 = doc2.new_page()
    p21.insert_text((50, 60), "Principles of Artificial Intelligence and Machine Learning", fontsize=18, fontname="helv")
    p21.insert_text((50, 85), "Authors: Dr. Stuart Russell & Dr. Peter Norvig", fontsize=11, fontname="helv")
    p21.insert_text((50, 105), "Subject: Artificial Intelligence", fontsize=10, fontname="helv")
    p21.insert_text((50, 135), "Chapter 1: Supervised Learning and Gradient Descent", fontsize=14, fontname="helv")
    p21.insert_text((50, 165),
        "Machine learning models learn patterns directly from empirical datasets rather than following static rules.\n\n"
        "1.1 Supervised Learning Overview:\n"
        "In supervised learning, algorithms are provided input feature vectors x paired with ground-truth targets y.\n"
        "When y is continuous (such as predicting house prices or temperature), the task is Regression.\n"
        "When y is discrete (such as classifying spam vs non-spam emails), the task is Classification.\n\n"
        "1.2 Gradient Descent Optimization:\n"
        "Gradient descent minimizes a differentiable loss function L(w) with respect to model weights w.\n"
        "The parameter update formula moves opposite to the gradient:\n"
        "w_new = w_old - alpha * grad(L(w)), where alpha is the learning rate.\n"
        "If alpha is too small, convergence takes excessive iterations; if too large, optimization can diverge.\n"
        "Stochastic Gradient Descent (SGD) approximates the true gradient using mini-batches of training samples,\n"
        "offering substantial computational speedups and escaping shallow local minima.",
        fontsize=10,
        fontname="helv"
    )

    # Page 2: Chapter 2 - Deep Neural Networks & Backpropagation
    p22 = doc2.new_page()
    p22.insert_text((50, 60), "Chapter 2: Deep Neural Networks and Backpropagation", fontsize=14, fontname="helv")
    p22.insert_text((50, 95),
        "Deep neural networks stack multiple parameterized layers to learn hierarchical abstract representations.\n\n"
        "2.1 Neurons and Non-linear Activation Functions:\n"
        "Each artificial neuron calculates an affine transformation z = w^T x + b, followed by an activation f(z).\n"
        "Non-linear activations prevent deep architectures from collapsing mathematically into a single linear matrix.\n"
        "Key Activation Functions:\n"
        "- ReLU (Rectified Linear Unit): f(z) = max(0, z). Fast to compute, prevents vanishing gradients for positive inputs.\n"
        "- Sigmoid: f(z) = 1 / (1 + exp(-z)). Compresses outputs into (0, 1), commonly used for binary probability outputs.\n"
        "- Softmax: Exponentiates and normalizes output logits into a valid categorical probability distribution.\n\n"
        "2.2 Backpropagation Algorithm:\n"
        "Backpropagation computes the exact gradient of the scalar loss with respect to every weight in the network.\n"
        "It applies the calculus chain rule backwards from output loss down through hidden layers to input layers.\n"
        "Modern automatic differentiation engines (like PyTorch and JAX) implement backpropagation as reverse-mode AD.",
        fontsize=10,
        fontname="helv"
    )

    # Page 3: Chapter 3 - Overfitting and Regularization
    p23 = doc2.new_page()
    p23.insert_text((50, 60), "Chapter 3: Generalization, Overfitting, and Regularization", fontsize=14, fontname="helv")
    p23.insert_text((50, 95),
        "A central challenge in machine learning is achieving generalization on unseen validation or test distributions.\n\n"
        "3.1 Bias-Variance Tradeoff:\n"
        "- Underfitting (High Bias): Occurs when model capacity is too restrictive to capture true data relationships.\n"
        "- Overfitting (High Variance): Occurs when a high-capacity model memorizes noise and quirks of the training set.\n\n"
        "3.2 Proven Regularization Strategies:\n"
        "1. L2 Regularization (Weight Decay): Appends a penalty term lambda * ||w||^2 to the loss function.\n"
        "   This penalizes large weights and promotes smoother, more generalized decision boundaries.\n"
        "2. L1 Regularization (Lasso): Adds lambda * sum(|w_i|), driving small weights exactly to zero for feature selection.\n"
        "3. Dropout: During each forward pass of training, randomly zeroes out hidden neuron outputs with probability p\n"
        "   (typically p = 0.5), preventing fragile feature co-adaptation and mimicking an ensemble of sub-networks.\n"
        "4. Early Stopping: Tracks loss on an independent validation set, terminating training when validation loss degrades.",
        fontsize=10,
        fontname="helv"
    )

    doc2.set_toc([
        [1, "Chapter 1: Supervised Learning and Gradient Descent", 1],
        [1, "Chapter 2: Deep Neural Networks and Backpropagation", 2],
        [1, "Chapter 3: Generalization, Overfitting, and Regularization", 3],
    ])
    doc2.save(str(books_dir / "artificial_intelligence_and_machine_learning.pdf"))
    doc2.close()
    print("Sample textbooks successfully written to backend/data/books/")

if __name__ == "__main__":
    create_sample_books()
