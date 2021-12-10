'use strict';

function QueueLinkedList() {
  this.length = 0;
}

QueueLinkedList.prototype.add = function(value) {
  if (this.queue) {
    this.lastElement.next = {value: value};
    this.lastElement = this.lastElement.next;
  } else {
    this.queue = {value: value};
    this.lastElement = this.queue;
  }
  ++this.length;
};

QueueLinkedList.prototype.getFirst = function() {
  return this.queue && this.queue.value;
};

QueueLinkedList.prototype.shift = function() {
  var value = this.queue && this.queue.value;

  if (value) {
    this.queue = this.queue.next;
    this.lastElement = this.queue;
    --this.length;
  }

  return value;
};

QueueLinkedList.prototype.getLength = function() {
  return this.length;
}

module.exports = QueueLinkedList;
