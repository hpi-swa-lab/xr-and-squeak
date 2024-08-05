Class {
	#name : #XRObjectTest,
	#superclass : #TestCase,
	#instVars : [
		'actualJS'
	],
	#category : #'SqueakXR-Core-Tests'
}

{ #category : #'as yet unclassified' }
XRObjectTest >> setUp [

	actualJS := Smalltalk at: #JS ifAbsent: nil.
	Smalltalk at: #JS put: (XRJSMock new)
]

{ #category : #'as yet unclassified' }
XRObjectTest >> tearDown [

	Smalltalk at: #JS put: actualJS
]

{ #category : #'as yet unclassified' }
XRObjectTest >> testCanAddChild [

	| child object |
	object := XRObject new.
	
	self assert: object children isEmpty.
	
	child := XRObject new.
	object addChild: child.
	self assert: (object children includes: child).
]

{ #category : #'as yet unclassified' }
XRObjectTest >> testCanHaveChildren [

	| child object |
	object := XRObject new.
	
	self assert: object children isEmpty.
	
	child := XRObject new.
	object addChild: child.
	self assert: (object children includes: child).
]

{ #category : #'as yet unclassified' }
XRObjectTest >> testCanHaveParent [

	| object parent |
	parent := XRObject new.
	object := XRObject new.
	
	parent addChild: object.
	
	self assert: object parent == parent
]

{ #category : #'as yet unclassified' }
XRObjectTest >> testCanRemoveChild [

	| child object |
	object := XRObject new.
	child := XRObject new.
	
	object addChild: child.
	object removeChild: child.
	
	self assert: (object children includes: child) not.
]

{ #category : #'as yet unclassified' }
XRObjectTest >> testCancelsEventBubbling [

	| child object |
	object := XRObjectMock new.
	child := XRObjectMock new.
	object addChild: child.
	
	child forbidEventPropagation.
	child handleEvent: XRPointingEvent new.
	
	self assert: object receivedEvent not.
]

{ #category : #'as yet unclassified' }
XRObjectTest >> testEventBubblesUp [

	| child object |
	object := XRObjectMock new.
	child := XRObject new.
	object addChild: child.
	
	child handleEvent: XRPointingEvent new.
	
	self assert: object receivedEvent.
]

{ #category : #'as yet unclassified' }
XRObjectTest >> testFindsChildFromIdentifier [

	| object childObject |
	object := XRObject new.
	childObject := XRObject new.
	object addChild: childObject.
	object addChild: (XRObject new).
	
	self assert: (object xrObjectWithIdentifier: childObject identifier) == childObject
]

{ #category : #'as yet unclassified' }
XRObjectTest >> testFindsDescendantFromIdentifier [

	| object childObject grandChildObject |
	object := XRObject new.
	childObject := XRObject new.
	grandChildObject := XRObject new.
	object addChild: childObject.
	object addChild: (XRObject new).
	childObject addChild: grandChildObject.
	childObject addChild: (XRObject new).
	
	self assert: (object xrObjectWithIdentifier: grandChildObject identifier) == grandChildObject
]

{ #category : #'as yet unclassified' }
XRObjectTest >> testFindsSelfFromIdentifier [

	| object |
	object := XRObject new.
	object addChild: (XRObject new).
	
	self assert: (object xrObjectWithIdentifier: object identifier) == object
]

{ #category : #'as yet unclassified' }
XRObjectTest >> testHasNoParentAfterRemoval [

	| object parent |
	parent := XRObject new.
	object := XRObject new.
	
	parent addChild: object.
	parent removeChild: object.
	
	self assert: object parent = nil
]

{ #category : #'as yet unclassified' }
XRObjectTest >> testHasParent [

	| object parent |
	parent := XRObject new.
	object := XRObject new.
	
	parent addChild: object.
	
	self assert: object parent == parent
]

{ #category : #'as yet unclassified' }
XRObjectTest >> testMatchesOwnIdentifier [

	| object |
	object := XRObject new.
	self assert: (object matchesIdentifier: object identifier)
]
