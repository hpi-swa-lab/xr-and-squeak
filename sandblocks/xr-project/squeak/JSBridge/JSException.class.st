"
An exception for JavaScript errors -- holds the error
"
Class {
	#name : #JSException,
	#superclass : #Exception,
	#instVars : [
		'jsError'
	],
	#category : #'JSBridge-Core'
}

{ #category : #exceptionInstantiator }
JSException class >> error: jsError [
	JSException new error: jsError
]

{ #category : #signaling }
JSException >> error: error [
	jsError := error.
	self signal: error message
]
